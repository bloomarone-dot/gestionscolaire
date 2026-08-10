import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Archive, Plus, Pencil, Trash2 } from 'lucide-react';
import * as api from '../../../api/api';
import { useAuth } from '../../../context/useAuth';
import { Badge, Button, Card, DataTable, Input, Modal, PageHeader } from '../../../components/ui';
import {
  canManageModeles,
  emptyTemplateV1,
  formatBulletinModeleError,
  statusTone,
} from '../../../utils/bulletinTemplateCatalog';

const BULLETIN_TYPES = [
  { id: 'primary', label: 'Primaire', kind: 'primary' },
  { id: 'secondary', label: 'Secondaire', kind: 'secondary' },
  { id: 'vocational', label: 'Formation professionnelle', kind: 'vocational', available: false },
  { id: 'blank', label: 'Modèle vierge', kind: 'blank' },
];

const LANGUAGE_OPTIONS = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
  { id: 'bilingual', label: 'Bilingue' },
];

const FALLBACK_STARTERS = [
  {
    id: 'cameroon_secondary_standard',
    name: 'Bulletin secondaire camerounais',
    description: 'Structure officielle neutre : en-tête, élève, notes par groupes, résumé, signatures.',
    kind: 'secondary',
    language_modes: ['fr', 'en', 'bilingual'],
    available: true,
    default_language: 'bilingual',
  },
  {
    id: 'cameroon_primary_standard',
    name: 'Bulletin primaire camerounais',
    description: 'Modèle primaire neutre. Compétences : limitation registry documentée.',
    kind: 'primary',
    language_modes: ['fr', 'en', 'bilingual'],
    available: true,
    default_language: 'fr',
  },
  {
    id: 'blank_v1',
    name: 'Modèle vierge',
    description: 'Créer librement à partir d’une page A4 vide.',
    kind: 'blank',
    language_modes: ['fr', 'en', 'bilingual'],
    available: true,
    default_language: 'fr',
  },
];

function deepClone(value) {
  return structuredClone(value);
}

function pickStarterDefinition(starter, language) {
  const defs = starter?.definitions;
  if (defs && typeof defs === 'object') {
    if (defs[language]) return deepClone(defs[language]);
    const fallbackLang = starter.default_language || 'fr';
    if (defs[fallbackLang]) return deepClone(defs[fallbackLang]);
    const first = Object.values(defs)[0];
    if (first) return deepClone(first);
  }
  if (starter?.kind === 'blank' || starter?.id === 'blank_v1') {
    return emptyTemplateV1('Modèle vierge');
  }
  return null;
}

const INITIAL_WIZARD = {
  step: 1,
  name: 'Nouveau bulletin',
  bulletinType: 'secondary',
  language: 'bilingual',
  starterId: 'cameroon_secondary_standard',
};

export function BulletinModelesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = canManageModeles(user?.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [wizard, setWizard] = useState(INITIAL_WIZARD);
  const [starters, setStarters] = useState(FALLBACK_STARTERS);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchBulletinModeles();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openCreateWizard() {
    setWizard(INITIAL_WIZARD);
    setCreateOpen(true);
    setError('');
    try {
      const catalog = await api.fetchBulletinTemplateCatalog();
      if (Array.isArray(catalog?.starters) && catalog.starters.length) {
        setStarters(catalog.starters);
      }
    } catch {
      setStarters(FALLBACK_STARTERS);
    }
  }

  const availableStarters = useMemo(() => {
    const typeMeta = BULLETIN_TYPES.find((t) => t.id === wizard.bulletinType);
    const kind = typeMeta?.kind;
    return starters.filter((s) => {
      if (!s.available) return false;
      if (kind === 'blank') return s.kind === 'blank';
      if (s.kind === 'blank') return true;
      return s.kind === kind;
    });
  }, [starters, wizard.bulletinType]);

  useEffect(() => {
    if (!createOpen) return;
    const match = availableStarters.find((s) => s.id === wizard.starterId)
      || availableStarters[0];
    if (match && match.id !== wizard.starterId) {
      setWizard((w) => ({
        ...w,
        starterId: match.id,
        language: match.default_language || w.language,
      }));
    }
  }, [availableStarters, createOpen, wizard.starterId]);

  async function handleCreate() {
    setSaving(true);
    setError('');
    try {
      const starter = starters.find((s) => s.id === wizard.starterId)
        || availableStarters[0]
        || FALLBACK_STARTERS.find((s) => s.id === 'blank_v1');
      let definition = pickStarterDefinition(starter, wizard.language);
      if (!definition) {
        // Recharge catalogue avec définitions si fallback sans defs
        const catalog = await api.fetchBulletinTemplateCatalog();
        const fromApi = (catalog?.starters || []).find((s) => s.id === starter.id);
        definition = pickStarterDefinition(fromApi || starter, wizard.language);
      }
      if (!definition) {
        definition = emptyTemplateV1(wizard.name);
      }
      definition = deepClone(definition);
      definition.name = wizard.name.trim() || definition.name || 'Nouveau bulletin';
      if (!definition.meta || typeof definition.meta !== 'object') definition.meta = {};
      definition.meta = {
        ...definition.meta,
        language_mode: wizard.language,
        starter_id: starter?.id || 'blank_v1',
        kind: starter?.kind || 'blank',
      };

      const created = await api.createBulletinModele({
        name: definition.name,
        definition,
        description: starter?.description || '',
      });
      setCreateOpen(false);
      setNotice('Modèle créé (brouillon) à partir du modèle de départ.');
      navigate(`/app/bulletins/modeles/${created.id}`);
    } catch (err) {
      setError(err.message || 'Création impossible');
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate(id) {
    if (!window.confirm('Dupliquer ce modèle ?')) return;
    try {
      const copy = await api.duplicateBulletinModele(id);
      setNotice('Modèle dupliqué.');
      await load();
      navigate(`/app/bulletins/modeles/${copy.id}`);
    } catch (err) {
      setError(err.message || 'Duplication impossible');
    }
  }

  async function handleArchive(id) {
    if (!window.confirm('Archiver ce modèle ?')) return;
    try {
      await api.archiveBulletinModele(id);
      setNotice('Modèle archivé.');
      await load();
    } catch (err) {
      setError(err.message || 'Archivage impossible');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer définitivement ce brouillon ?')) return;
    try {
      await api.deleteBulletinModele(id);
      setNotice('Modèle supprimé.');
      await load();
    } catch (err) {
      setError(formatBulletinModeleError(
        err.message,
        'Impossible de supprimer ce modèle. Vérifiez son statut (seul un brouillon non publié peut être supprimé) ou ses droits.',
      ));
    }
  }

  function setType(bulletinType) {
    const meta = BULLETIN_TYPES.find((t) => t.id === bulletinType);
    if (meta?.available === false) return;
    const defaultStarter = bulletinType === 'primary'
      ? 'cameroon_primary_standard'
      : bulletinType === 'blank'
        ? 'blank_v1'
        : 'cameroon_secondary_standard';
    const starter = starters.find((s) => s.id === defaultStarter);
    setWizard((w) => ({
      ...w,
      bulletinType,
      starterId: defaultStarter,
      language: starter?.default_language || (bulletinType === 'secondary' ? 'bilingual' : 'fr'),
      step: Math.max(w.step, 1),
    }));
  }

  if (!canEdit) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-600">Accès réservé à l&apos;administration / direction.</p>
      </Card>
    );
  }

  const canGoNext = wizard.step < 3;
  const canCreate = wizard.step === 3 && wizard.name.trim() && wizard.starterId;

  return (
    <div data-testid="bulletin-modeles-page">
      <PageHeader
        title="Modèles de bulletin"
        description="Créez et personnalisez les bulletins de votre établissement (moteur V2)."
        actions={
          <Button onClick={openCreateWizard} data-testid="create-modele-btn">
            <Plus className="h-4 w-4" /> Créer un modèle
          </Button>
        }
      />
      {notice && <p className="mb-3 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <DataTable
        title={loading ? 'Chargement…' : `${rows.length} modèle(s)`}
        columns={[
          { key: 'name', label: 'Nom' },
          { key: 'status', label: 'Statut', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
          { key: 'is_system', label: 'Type', render: (r) => (r.is_system ? 'Système' : 'Établissement') },
          { key: 'is_default', label: 'Défaut', render: (r) => (r.is_default ? 'Oui' : '—') },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        renderActions={(r) => (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="ghost"
              className="px-2 py-1"
              onClick={() => navigate(`/app/bulletins/modeles/${r.id}`)}
              title={r.is_system ? 'Ouvrir (lecture seule — dupliquez pour modifier)' : 'Éditer'}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="px-2 py-1" onClick={() => handleDuplicate(r.id)} title="Dupliquer">
              <Copy className="h-4 w-4" />
            </Button>
            {!r.is_system && r.status !== 'ARCHIVED' && (
              <Button variant="ghost" className="px-2 py-1" onClick={() => handleArchive(r.id)} title="Archiver">
                <Archive className="h-4 w-4" />
              </Button>
            )}
            {!r.is_system && r.status === 'DRAFT' && (
              <Button variant="ghost" className="px-2 py-1 text-rose-600" onClick={() => handleDelete(r.id)} title="Supprimer">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Créer un modèle de bulletin"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            {wizard.step > 1 && (
              <Button
                variant="secondary"
                onClick={() => setWizard((w) => ({ ...w, step: w.step - 1 }))}
              >
                Retour
              </Button>
            )}
            {canGoNext ? (
              <Button
                data-testid="wizard-next"
                onClick={() => setWizard((w) => ({ ...w, step: w.step + 1 }))}
              >
                Continuer
              </Button>
            ) : (
              <Button
                data-testid="wizard-create"
                disabled={saving || !canCreate}
                onClick={handleCreate}
              >
                {saving ? 'Création…' : 'Créer le modèle'}
              </Button>
            )}
          </>
        )}
      >
        <div className="space-y-4" data-testid="create-modele-wizard">
          <p className="text-xs text-slate-500">Étape {wizard.step} / 3</p>

          {wizard.step === 1 && (
            <fieldset data-testid="wizard-step-type">
              <legend className="mb-2 text-sm font-medium text-slate-800">Type de bulletin</legend>
              <div className="space-y-2">
                {BULLETIN_TYPES.map((opt) => {
                  const disabled = opt.available === false;
                  return (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm ${
                        disabled ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400' : 'border-slate-200'
                      } ${wizard.bulletinType === opt.id ? 'border-slate-800 bg-slate-50' : ''}`}
                    >
                      <input
                        type="radio"
                        name="bulletinType"
                        disabled={disabled}
                        checked={wizard.bulletinType === opt.id}
                        onChange={() => setType(opt.id)}
                      />
                      <span>{opt.label}{disabled ? ' (indisponible)' : ''}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {wizard.step === 2 && (
            <fieldset data-testid="wizard-step-language">
              <legend className="mb-2 text-sm font-medium text-slate-800">Langue</legend>
              <div className="space-y-2">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm border-slate-200 ${
                      wizard.language === opt.id ? 'border-slate-800 bg-slate-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="language"
                      checked={wizard.language === opt.id}
                      onChange={() => setWizard((w) => ({ ...w, language: opt.id }))}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {wizard.step === 3 && (
            <div className="space-y-3" data-testid="wizard-step-starter">
              <label className="block text-sm">
                Nom du modèle
                <Input
                  className="mt-1"
                  value={wizard.name}
                  onChange={(e) => setWizard((w) => ({ ...w, name: e.target.value }))}
                />
              </label>
              <div className="text-sm font-medium text-slate-800">Modèle de départ</div>
              <div className="space-y-2">
                {availableStarters.map((starter) => (
                  <button
                    key={starter.id}
                    type="button"
                    data-testid={`starter-card-${starter.id}`}
                    onClick={() => setWizard((w) => ({ ...w, starterId: starter.id }))}
                    className={`w-full rounded border px-3 py-3 text-left ${
                      wizard.starterId === starter.id
                        ? 'border-slate-800 bg-slate-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{starter.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {starter.kind === 'blank' ? 'Créer librement' : 'Standard'}
                      {' · '}
                      Français / Anglais / Bilingue
                    </div>
                    {starter.description && (
                      <p className="mt-1 text-xs text-slate-600">{starter.description}</p>
                    )}
                    <span className="mt-2 inline-block text-xs font-medium text-slate-700">
                      {starter.kind === 'blank' ? 'Commencer' : 'Utiliser ce modèle'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default BulletinModelesPage;

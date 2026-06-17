import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, GraduationCap } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, DataTable, EmptyState, PageHeader, Select } from '../../components/ui';

// §10 — Outil de fin d'année : décider du passage de chaque élève d'une classe.
const DECISIONS = [
  ['ADMIS', 'Admis (passe en classe supérieure)'],
  ['REDOUBLE', 'Redouble'],
  ['REORIENTE', 'Réorienté (change de série)'],
  ['SORTANT', 'Sortant (quitte / diplômé)'],
];

// §10.2 — niveau supérieur logique selon le référentiel MINESEC (codes niveaux).
const NEXT_LEVEL = {
  // Francophone général
  '6E': '5E', '5E': '4E', '4E': '3E', '3E': '2ND', '2ND': '1ERE', '1ERE': 'TLE', TLE: null,
  // Francophone technique
  '1CETIC': '2CETIC', '2CETIC': '3CETIC', '3CETIC': null,
  '2ND-T': '1ERE-T', '1ERE-T': 'TLE-T', 'TLE-T': null,
  // Anglophone général
  F1: 'F2', F2: 'F3', F3: 'F4', F4: 'F5', F5: 'LS', LS: 'US', US: null,
  // Anglophone technique
  TF1: 'TF2', TF2: 'TF3', TF3: 'TF4', TF4: 'TF5', TF5: 'LST', LST: 'UST', UST: null,
};

function className(classe) {
  return classe?.nom || classe?.nom_personnalise || classe?.name || `Classe ${classe?.id}`;
}

// Classe de destination « logique » : niveau suivant, même série si possible (§10.2).
function suggestDestination(classes, source) {
  if (!source) return '';
  const next = NEXT_LEVEL[source.level_code];
  if (!next) return '';
  const others = classes.filter((c) => c.level_code === next && String(c.id) !== String(source.id));
  const match = (source.series_code ? others.find((c) => c.series_code === source.series_code) : null) || others[0];
  return match ? String(match.id) : '';
}

function Notice({ message, tone = 'emerald' }) {
  if (!message) return null;
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${tones[tone]}`}>{message}</div>;
}

export default function PromotionsPage() {
  const [classes, setClasses] = useState([]);
  const [sourceId, setSourceId] = useState('');
  const [rows, setRows] = useState([]);          // { id, name, matricule, status, dest_classe_id }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);    // { message, tone }
  const [bulkDest, setBulkDest] = useState('');

  useEffect(() => {
    api.fetchClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  // Toutes les classes sont sélectionnables (la source elle-même = cas « Redouble »).
  const destOptions = classes;

  const loadStudents = useCallback(async (classeId, suggestedDestId = '') => {
    if (!classeId) { setRows([]); return; }
    setLoading(true);
    setNotice(null);
    try {
      const eleves = await api.getClassEleves(classeId);
      setRows(eleves.map((e) => ({
        id: e.id,
        name: [e.nom, e.prenom].filter(Boolean).join(' ') || e.name || `Élève ${e.id}`,
        matricule: e.matricule || `EL-${e.id}`,
        status: 'ADMIS',
        dest_classe_id: suggestedDestId,  // §10.2 : pré-rempli sur la destination logique
      })));
    } catch (err) {
      setRows([]);
      setNotice({ message: err.message || 'Impossible de charger les élèves.', tone: 'rose' });
    } finally {
      setLoading(false);
    }
  }, []);

  function onSourceChange(value) {
    setSourceId(value);
    const source = classes.find((c) => String(c.id) === String(value));
    const suggestion = suggestDestination(classes, source);
    setBulkDest(suggestion);
    loadStudents(value, suggestion);
    if (suggestion) {
      const dest = classes.find((c) => String(c.id) === String(suggestion));
      setTimeout(() => setNotice({ message: `Destination proposée pour les admis : ${className(dest)} (modifiable).`, tone: 'blue' }), 0);
    }
  }

  function patchRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function applyBulkDest(value) {
    setBulkDest(value);
    setRows((prev) => prev.map((r) => (
      r.status === 'ADMIS' || r.status === 'REORIENTE' ? { ...r, dest_classe_id: value } : r
    )));
  }

  const stats = useMemo(() => {
    const acc = { ADMIS: 0, REDOUBLE: 0, REORIENTE: 0, SORTANT: 0 };
    rows.forEach((r) => { acc[r.status] = (acc[r.status] || 0) + 1; });
    return acc;
  }, [rows]);

  function validate() {
    const needDest = rows.filter(
      (r) => ['ADMIS', 'REDOUBLE', 'REORIENTE'].includes(r.status) && !r.dest_classe_id,
    );
    return needDest;
  }

  async function submit() {
    const missing = validate();
    if (missing.length) {
      setNotice({
        message: `${missing.length} élève(s) sans classe de destination. Sélectionnez une destination ou marquez-les "Sortant".`,
        tone: 'rose',
      });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        source_classe_id: Number(sourceId),
        items: rows.map((r) => ({
          eleve_id: r.id,
          status: r.status,
          dest_classe_id: r.status === 'SORTANT' ? null : Number(r.dest_classe_id),
        })),
      };
      const res = await api.applyPromotions(payload);
      setNotice({ message: `Passages appliqués : ${res.applied ?? rows.length} élève(s).`, tone: 'emerald' });
      loadStudents(sourceId);
    } catch (err) {
      setNotice({ message: err.message || "Échec de l'application des passages.", tone: 'rose' });
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'name', label: 'Élève' },
    {
      key: 'status',
      label: 'Décision',
      render: (row) => (
        <Select
          value={row.status}
          className="min-w-[16rem]"
          onChange={(e) => {
            const status = e.target.value;
            // Redouble → reste dans la classe source ; Sortant → aucune destination ; sinon inchangé.
            const dest = status === 'SORTANT' ? '' : status === 'REDOUBLE' ? String(sourceId) : row.dest_classe_id;
            patchRow(row.id, { status, dest_classe_id: dest });
          }}
        >
          {DECISIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      ),
    },
    {
      key: 'dest',
      label: 'Classe de destination',
      render: (row) => (
        row.status === 'SORTANT'
          ? <Badge tone="rose">Quitte l'établissement</Badge>
          : (
            <Select
              value={row.dest_classe_id}
              className="min-w-[12rem]"
              onChange={(e) => patchRow(row.id, { dest_classe_id: e.target.value })}
            >
              <option value="">— Choisir —</option>
              {destOptions.map((c) => <option key={c.id} value={c.id}>{className(c)}</option>)}
            </Select>
          )
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Passages de fin d'année"
        breadcrumb="Scolarité"
        description="Décidez du passage de chaque élève : admis, redouble, réorienté ou sortant, puis appliquez en une fois."
        actions={
          <Button onClick={submit} disabled={!sourceId || !rows.length || saving}>
            <CheckCircle2 size={16} /> {saving ? 'Application…' : 'Appliquer les passages'}
          </Button>
        }
      />

      <Notice message={notice?.message} tone={notice?.tone} />

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Classe d'origine</label>
          <Select value={sourceId} onChange={(e) => onSourceChange(e.target.value)}>
            <option value="">— Sélectionner une classe —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{className(c)}</option>)}
          </Select>
        </div>
        {sourceId && rows.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Destination par défaut (admis)</label>
            <Select value={bulkDest} onChange={(e) => applyBulkDest(e.target.value)}>
              <option value="">— Appliquer à tous les admis —</option>
              {destOptions.map((c) => <option key={c.id} value={c.id}>{className(c)}</option>)}
            </Select>
          </div>
        )}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <Badge tone="emerald">{stats.ADMIS} admis</Badge>
            <Badge tone="amber">{stats.REDOUBLE} redoublent</Badge>
            <Badge tone="blue">{stats.REORIENTE} réorientés</Badge>
            <Badge tone="rose">{stats.SORTANT} sortants</Badge>
          </div>
        )}
      </div>

      {!sourceId ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="Sélectionnez une classe d'origine"
          description="Choisissez la classe dont vous voulez gérer les passages de fin d'année."
        />
      ) : loading ? (
        <EmptyState icon={GraduationCap} title="Chargement des élèves…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Aucun élève dans cette classe" />
      ) : (
        <DataTable
          title={`${rows.length} élève(s)`}
          description="Par défaut, tous sont marqués « Admis ». Ajustez individuellement si besoin."
          columns={columns}
          rows={rows}
        />
      )}
    </div>
  );
}

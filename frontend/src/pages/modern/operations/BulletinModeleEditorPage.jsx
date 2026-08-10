import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Save, Upload } from 'lucide-react';
import * as api from '../../../api/api';
import { useAuth } from '../../../context/useAuth';
import { Badge, Button, Input, Select } from '../../../components/ui';
import ModeleAssignationsPanel from '../../../components/bulletinModele/ModeleAssignationsPanel';
import ModeleCanvas from '../../../components/bulletinModele/ModeleCanvas';
import ModelePalette from '../../../components/bulletinModele/ModelePalette';
import ModelePreviewModal from '../../../components/bulletinModele/ModelePreviewModal';
import ModelePropertiesPanel from '../../../components/bulletinModele/ModelePropertiesPanel';
import {
  canManageModeles,
  createComponent,
  emptyTemplateV1,
  newComponentId,
  statusTone,
  validateDefinitionClient,
} from '../../../utils/bulletinTemplateCatalog';

export function BulletinModeleEditorPage() {
  const { modeleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEditRole = canManageModeles(user?.role);

  const [modele, setModele] = useState(null);
  const [definition, setDefinition] = useState(null);
  const [editingVersionId, setEditingVersionId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [catalog, setCatalog] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewEleveId, setPreviewEleveId] = useState('');
  const [showAssignations, setShowAssignations] = useState(false);

  const readOnly = !canEditRole || !!modele?.is_system || modele?.status === 'ARCHIVED';
  const selected = useMemo(
    () => (definition?.components || []).find((c) => c.id === selectedId) || null,
    [definition, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [detail, cat] = await Promise.all([
        api.fetchBulletinModele(modeleId),
        api.fetchBulletinTemplateCatalog().catch(() => null),
      ]);
      setModele(detail);
      setCatalog(cat);
      const def = detail.current_version?.definition
        || emptyTemplateV1(detail.name || 'Modèle');
      setDefinition(structuredClone(def));
      setEditingVersionId(detail.current_version?.id || null);
      setDirty(false);
      setSelectedId(null);
    } catch (err) {
      setError(err.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [modeleId]);

  useEffect(() => { load(); }, [load]);

  function updateDefinition(next) {
    setDefinition(next);
    setDirty(true);
  }

  function patchComponent(id, partial) {
    updateDefinition({
      ...definition,
      components: definition.components.map((c) => (
        c.id === id ? { ...c, ...partial, props: partial.props ? partial.props : c.props, frame: partial.frame ? partial.frame : c.frame } : c
      )),
    });
  }

  function addComponent(type) {
    if (readOnly) return;
    const defaults = catalog?.components?.find((c) => c.type === type)?.default_props;
    const component = createComponent(type, defaults);
    updateDefinition({
      ...definition,
      components: [...(definition.components || []), component],
    });
    setSelectedId(component.id);
  }

  function duplicateComponent(id) {
    if (readOnly) return;
    const source = definition.components.find((c) => c.id === id);
    if (!source) return;
    const copy = {
      ...structuredClone(source),
      id: newComponentId(source.type),
      frame: {
        ...source.frame,
        x_mm: (source.frame?.x_mm || 0) + 5,
        y_mm: (source.frame?.y_mm || 0) + 5,
      },
    };
    updateDefinition({ ...definition, components: [...definition.components, copy] });
    setSelectedId(copy.id);
  }

  function deleteComponent(id) {
    if (readOnly) return;
    if (!window.confirm('Supprimer ce composant ?')) return;
    updateDefinition({
      ...definition,
      components: definition.components.filter((c) => c.id !== id),
    });
    if (selectedId === id) setSelectedId(null);
  }

  async function ensureEditableDraft() {
    if (modele.status !== 'PUBLISHED') return editingVersionId;
    // Version publiée immuable → créer une version brouillon d'édition.
    const version = await api.createBulletinModeleVersion(
      modele.id,
      definition,
      "Brouillon d'édition depuis l'éditeur",
    );
    setEditingVersionId(version.id);
    setNotice(`Version ${version.version_number} créée (brouillon). La version publiée reste active jusqu'à republication.`);
    return version.id;
  }

  async function handleSave() {
    if (readOnly) return null;
    const clientErrors = validateDefinitionClient(definition);
    if (clientErrors.length) {
      setError(clientErrors.join(' · '));
      return null;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      let versionId = editingVersionId;
      if (modele.status === 'PUBLISHED') {
        // Si on édite encore la version courante publiée, checkout d'abord.
        if (!versionId || versionId === modele.current_version?.id) {
          versionId = await ensureEditableDraft();
        }
        await api.updateBulletinModeleVersion(modele.id, versionId, {
          ...definition,
          name: definition.name || modele.name,
        });
        if (definition.name && definition.name !== modele.name) {
          await api.updateBulletinModele(modele.id, { name: definition.name });
        }
      } else {
        const updated = await api.updateBulletinModele(modele.id, {
          name: definition.name || modele.name,
          definition: {
            ...definition,
            name: definition.name || modele.name,
          },
        });
        setModele(updated);
        versionId = updated.current_version?.id || versionId;
        setEditingVersionId(versionId);
        setDefinition(structuredClone(updated.current_version?.definition || definition));
      }
      setDirty(false);
      setNotice('Enregistré.');
      return versionId;
    } catch (err) {
      setError(err.message || 'Enregistrement impossible');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (readOnly) return;
    if (!window.confirm('Publier ce modèle ? La version courante d’édition deviendra immuable.')) return;
    setSaving(true);
    setError('');
    try {
      let versionId = editingVersionId;
      if (dirty) {
        versionId = await handleSave();
        if (!versionId) return;
      }
      const published = await api.publishBulletinModele(modele.id, versionId);
      setModele(published);
      setEditingVersionId(published.current_version?.id || null);
      setNotice('Modèle publié.');
      setDirty(false);
    } catch (err) {
      setError(err.message || 'Publication impossible');
    } finally {
      setSaving(false);
    }
  }

  async function handleNewVersion() {
    if (readOnly && !modele?.is_system) return;
    if (modele?.is_system) {
      setError('Dupliquez le modèle système avant de créer une version.');
      return;
    }
    setSaving(true);
    try {
      await api.createBulletinModeleVersion(modele.id, definition, 'Nouvelle version');
      await load();
      setNotice('Nouvelle version DRAFT créée.');
    } catch (err) {
      setError(err.message || 'Création de version impossible');
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError('');
    setPreview(null);
    try {
      let versionId = editingVersionId;
      if (dirty && !readOnly) {
        versionId = await handleSave();
        if (!versionId) {
          throw new Error(error || 'Enregistrez le modèle avant l’aperçu.');
        }
      }
      const eleveId = Number(previewEleveId);
      if (!eleveId) {
        throw new Error('Indiquez un ID élève autorisé pour l’aperçu (données réelles côté serveur).');
      }
      const result = await api.previewBulletinV2({
        modele_id: Number(modeleId),
        eleve_id: eleveId,
        version_id: versionId || undefined,
        trimestre: 1,
        scope: 'trimestre',
      });
      setPreview(result);
    } catch (err) {
      setPreviewError(err.message || 'Aperçu impossible');
    } finally {
      setPreviewLoading(false);
    }
  }

  if (!canEditRole) {
    return (
      <div className="p-6 text-sm text-slate-600">Accès réservé à l&apos;administration / direction.</div>
    );
  }

  if (loading || !definition) {
    return <div className="p-6 text-sm text-slate-500">Chargement de l&apos;éditeur…</div>;
  }

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-3.5rem)] flex-col bg-white" data-testid="bulletin-modele-editor">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-2">
        <Link to="/app/bulletins/modeles" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Modèles de bulletins
        </Link>
        <Input
          className="max-w-xs"
          disabled={readOnly}
          value={definition.name || ''}
          onChange={(e) => updateDefinition({ ...definition, name: e.target.value })}
          aria-label="Nom du modèle"
        />
        <Badge tone={statusTone(modele.status)}>{modele.status}</Badge>
        {modele.is_system && <Badge tone="violet">Système (lecture seule)</Badge>}
        {dirty && <span className="text-xs text-amber-600">Non enregistré</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select
            className="w-28"
            value={definition.page?.orientation || 'portrait'}
            disabled={readOnly}
            onChange={(e) => updateDefinition({
              ...definition,
              page: { ...definition.page, orientation: e.target.value },
            })}
            aria-label="Orientation"
          >
            <option value="portrait">A4 portrait</option>
            <option value="landscape">A4 paysage</option>
          </Select>
          <Select className="w-24" value={String(zoom)} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom">
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.25">125%</option>
            <option value="1.5">150%</option>
          </Select>
          <Input
            className="w-28"
            placeholder="ID élève"
            value={previewEleveId}
            onChange={(e) => setPreviewEleveId(e.target.value)}
            aria-label="ID élève aperçu"
          />
          <Button variant="secondary" onClick={handlePreview}>
            <Eye className="h-4 w-4" /> Aperçu
          </Button>
          {!modele.is_system && (
            <Button
              variant="secondary"
              onClick={() => setShowAssignations((v) => !v)}
              aria-pressed={showAssignations}
            >
              Assignation
            </Button>
          )}
          {!readOnly && (
            <>
              <Button variant="secondary" disabled={saving} onClick={handleNewVersion}>
                Nouvelle version
              </Button>
              <Button variant="secondary" disabled={saving || !dirty} onClick={handleSave}>
                <Save className="h-4 w-4" /> Enregistrer
              </Button>
              <Button disabled={saving} onClick={handlePublish}>
                <Upload className="h-4 w-4" /> Publier
              </Button>
            </>
          )}
          {modele.is_system && (
            <Button
              variant="secondary"
              onClick={async () => {
                const copy = await api.duplicateBulletinModele(modele.id);
                navigate(`/app/bulletins/modeles/${copy.id}`);
              }}
            >
              Dupliquer pour modifier
            </Button>
          )}
        </div>
      </header>

      {(error || notice) && (
        <div className="border-b border-slate-100 px-4 py-2 text-sm">
          {error && <span className="text-red-600">{error}</span>}
          {notice && <span className="text-emerald-700">{notice}</span>}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <ModelePalette
          readOnly={readOnly}
          catalogComponents={catalog?.components}
          onAdd={addComponent}
        />
        <ModeleCanvas
          definition={definition}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChangeComponent={patchComponent}
          zoom={zoom}
          readOnly={readOnly}
        />
        <ModelePropertiesPanel
          component={selected}
          definition={definition}
          readOnly={readOnly}
          variables={catalog?.variables}
          onChangeComponent={patchComponent}
          onChangeDefinition={updateDefinition}
          onDuplicate={duplicateComponent}
          onDelete={deleteComponent}
        />
      </div>

      {showAssignations && (
        <div className="max-h-[40%] overflow-y-auto border-t border-slate-200 px-4 py-2">
          <ModeleAssignationsPanel
            modeleId={modele.id}
            canEdit={canEditRole && !modele.is_system && modele.status !== 'ARCHIVED'}
            modeleStatus={modele.status}
          />
        </div>
      )}

      <ModelePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        preview={preview}
        loading={previewLoading}
        error={previewError}
      />
    </div>
  );
}

export default BulletinModeleEditorPage;

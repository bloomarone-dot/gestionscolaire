import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Archive, Plus, Pencil, Trash2 } from 'lucide-react';
import * as api from '../../../api/api';
import { useAuth } from '../../../context/useAuth';
import { Badge, Button, Card, DataTable, Input, Modal, PageHeader, Select } from '../../../components/ui';
import {
  canManageModeles,
  emptyTemplateV1,
  statusTone,
} from '../../../utils/bulletinTemplateCatalog';

export function BulletinModelesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = canManageModeles(user?.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: 'Nouveau bulletin', orientation: 'portrait' });
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

  async function handleCreate() {
    setSaving(true);
    setError('');
    try {
      const definition = emptyTemplateV1(form.name);
      definition.page.orientation = form.orientation;
      const created = await api.createBulletinModele({
        name: form.name,
        definition,
        description: '',
      });
      setCreateOpen(false);
      setNotice('Modèle créé (brouillon).');
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
      setError(err.message || 'Suppression impossible');
    }
  }

  if (!canEdit) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-600">Accès réservé à l&apos;administration / direction.</p>
      </Card>
    );
  }

  return (
    <div data-testid="bulletin-modeles-page">
      <PageHeader
        title="Modèles de bulletin"
        description="Créez et personnalisez les bulletins de votre établissement (moteur V2)."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
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
        title="Créer un modèle"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button disabled={saving || !form.name.trim()} onClick={handleCreate}>
              {saving ? 'Création…' : 'Créer'}
            </Button>
          </>
        )}
      >
        <div className="space-y-3">
          <label className="block text-sm">
            Nom
            <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="block text-sm">
            Format
            <Select className="mt-1" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })}>
              <option value="portrait">A4 portrait</option>
              <option value="landscape">A4 paysage</option>
            </Select>
          </label>
        </div>
      </Modal>
    </div>
  );
}

export default BulletinModelesPage;

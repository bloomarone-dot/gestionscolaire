import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, UserPlus, Users } from 'lucide-react';
import * as api from '../../api/api';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import { roleLabel } from '../../utils/navConfig';
import { Badge, Button, Card, DataTable, Input, PageHeader } from '../../components/ui';

const card = 'rounded-lg border border-solid border-slate-200 bg-white';
const lbl = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1';
const input = 'w-full rounded-md border border-solid border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500';

const emptyForm = {
  first_name: '', last_name: '', phone: '', password: '',
};

export default function TeamPage() {
  const navigate = useNavigate();
  const { labels: ui, isLanguageCenter } = useEstablishmentProfile();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm);

  async function loadAccounts() {
    try {
      setLoading(true);
      const data = await api.fetchEstablishmentAccounts();
      setAccounts(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Impossible de charger les comptes.');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAccounts(); }, []);

  async function handleCreateSecretary(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!form.phone.trim() || !form.password.trim()) {
      setError('Téléphone et mot de passe obligatoires.');
      return;
    }
    setSaving(true);
    try {
      await api.createStaffAccount({
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        phone: form.phone,
        password: form.password,
        role: 'secretaire',
      });
      setForm(emptyForm);
      setNotice('Compte secrétaire créé. La personne peut se connecter avec son téléphone.');
      await loadAccounts();
    } catch (err) {
      setError(err.message || 'Création impossible.');
    } finally {
      setSaving(false);
    }
  }

  const staffRows = accounts
    .filter((a) => a.role !== 'admin')
    .map((a) => ({
      id: a.id,
      name: [a.first_name, a.last_name].filter(Boolean).join(' ') || a.phone,
      phone: a.phone,
      role: roleLabel(a.role),
      roleKey: a.role,
      status: a.is_active === false ? 'Inactif' : 'Actif',
    }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={isLanguageCenter ? 'Équipe du centre' : 'Équipe & comptes'}
        description="Créez les comptes secrétaire et gérez les formateurs via la page enseignants."
      />

      {notice && (
        <div className="rounded-md border border-solid border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>
      )}
      {error && (
        <div className="rounded-md border border-solid border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className={`${card} p-5`}>
          <h2 className="mb-1 text-sm font-semibold text-slate-800">Nouveau compte secrétaire</h2>
          <p className="mb-4 text-xs text-slate-500">
            Accès inscriptions, apprenants, paiements et planning (selon les modules activés).
          </p>
          <form onSubmit={handleCreateSecretary} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Prénom</label>
                <Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Nom</label>
                <Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className={lbl}>Téléphone (connexion) *</label>
              <Input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="6XX XXX XXX" required />
            </div>
            <div>
              <label className={lbl}>Mot de passe *</label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Création…' : 'Créer le compte secrétaire'}
            </Button>
          </form>
        </Card>

        <Card className={`${card} p-5`}>
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Formateurs & direction</h2>
          <p className="mb-4 text-sm text-slate-600">
            Les {ui.teachers.toLowerCase()} et la direction se créent depuis la fiche personnel (compte de connexion inclus).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/app/teachers/nouveau')}>
              <UserPlus size={16} /> Nouveau {ui.teachers.toLowerCase().replace(/s$/, '')}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/app/teachers')}>
              <GraduationCap size={16} /> Liste {ui.teachers.toLowerCase()}
            </Button>
          </div>
        </Card>
      </div>

      <DataTable
        title="Comptes de l'établissement"
        columns={[
          { key: 'name', label: 'Nom' },
          { key: 'phone', label: 'Téléphone' },
          { key: 'role', label: 'Rôle' },
          {
            key: 'status',
            label: 'Statut',
            render: (row) => (
              <Badge tone={row.status === 'Actif' ? 'emerald' : 'slate'}>{row.status}</Badge>
            ),
          },
        ]}
        rows={loading ? [] : staffRows}
        emptyMessage={loading ? 'Chargement…' : 'Aucun compte (hors administrateur).'}
      />
    </div>
  );
}

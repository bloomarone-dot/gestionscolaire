import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../api/api';
import { establishmentKindLabel } from '../../utils/establishmentKind';

const card = 'rounded-lg border border-solid border-slate-200 bg-white';
const input = 'rounded-md border border-solid border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500';

export default function SuperAdminSchoolsPage() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadSchools = async () => {
    try {
      setLoading(true);
      const data = await api.fetchSchools();
      setSchools(data.filter((s) => s?.id != null));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSchools(); }, []);

  const filtered = useMemo(() => schools.filter((s) => {
    const matchSearch = !search
      || s.name?.toLowerCase().includes(search.toLowerCase())
      || s.city?.toLowerCase().includes(search.toLowerCase())
      || s.code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all'
      || (statusFilter === 'active' && s.is_active)
      || (statusFilter === 'inactive' && !s.is_active);
    return matchSearch && matchStatus;
  }), [schools, search, statusFilter]);

  const toggleActive = async (school) => {
    try {
      const updated = await api.toggleSchoolActive(school.id);
      setSchools((prev) => prev.map((s) => (s.id === school.id ? { ...s, is_active: updated.is_active ?? !s.is_active } : s)));
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Établissements</h1>
          <p className="text-sm text-slate-500">Créer, consulter et gérer les établissements.</p>
        </div>
        <button onClick={() => navigate('/superadmin/schools/new')}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          + Nouvel établissement
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Chargement…</div>
      ) : schools.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <p className="text-sm text-slate-500">Aucun établissement.</p>
          <button onClick={() => navigate('/superadmin/schools/new')}
            className="mt-4 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
            Créer le premier établissement
          </button>
        </div>
      ) : (
        <div className={card}>
          <div className="flex flex-wrap gap-2 border-b border-solid border-slate-200 p-3">
            <input className={`${input} flex-1`} type="search" placeholder="Rechercher par nom, ville, code…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-solid border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 font-semibold">Nom</th>
                  <th className="px-4 py-2 font-semibold">Code</th>
                  <th className="px-4 py-2 font-semibold">Ville</th>
                  <th className="px-4 py-2 font-semibold">Type</th>
                  <th className="px-4 py-2 font-semibold">Statut</th>
                  <th className="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Aucun résultat.</td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className="border-b border-solid border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-2 text-slate-500">{s.code || '—'}</td>
                    <td className="px-4 py-2 text-slate-500">{s.city || '—'}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {establishmentKindLabel(s.establishment_kind)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => navigate(`/superadmin/schools/${s.id}/edit`)}
                        className="rounded-md border border-solid border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100">
                        Modifier
                      </button>
                      <button onClick={() => toggleActive(s)}
                        className="ml-2 rounded-md border border-solid border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100">
                        {s.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

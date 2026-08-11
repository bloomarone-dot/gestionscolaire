import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import * as api from '../../api/api';
import { establishmentKindLabel } from '../../utils/establishmentKind';
import { Badge, Button, Card, DataTable, Input, PageHeader, Select } from '../../components/ui';

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
    <div>
      <PageHeader
        title="Établissements"
        description="Créer, consulter et gérer les établissements."
        actions={
          <Button onClick={() => navigate('/superadmin/schools/new')}>
            <Plus size={16} /> Nouvel établissement
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : schools.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-slate-500">Aucun établissement.</p>
          <Button className="mt-4" onClick={() => navigate('/superadmin/schools/new')}>
            Créer le premier établissement
          </Button>
        </Card>
      ) : (
        <DataTable
          title="Établissements"
          filters={
            <div className="flex flex-wrap gap-2">
              <Input
                className="flex-1"
                type="search"
                placeholder="Rechercher par nom, ville, code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                className="sm:w-48"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </Select>
            </div>
          }
          columns={[
            { key: 'name', label: 'Nom' },
            { key: 'code', label: 'Code', render: (s) => s.code || '—' },
            { key: 'city', label: 'Ville', render: (s) => s.city || '—' },
            {
              key: 'kind',
              label: 'Type',
              render: (s) => <Badge tone="slate">{establishmentKindLabel(s.establishment_kind)}</Badge>,
            },
            {
              key: 'status',
              label: 'Statut',
              render: (s) => <Badge tone={s.is_active ? 'emerald' : 'slate'}>{s.is_active ? 'Actif' : 'Inactif'}</Badge>,
            },
          ]}
          rows={filtered}
          emptyMessage="Aucun résultat."
          renderActions={(s) => (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate(`/superadmin/schools/${s.id}/edit`)}>
                Modifier
              </Button>
              <Button variant="secondary" onClick={() => toggleActive(s)}>
                {s.is_active ? 'Désactiver' : 'Activer'}
              </Button>
            </div>
          )}
        />
      )}
    </div>
  );
}

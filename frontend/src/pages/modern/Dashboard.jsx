import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, School, Users } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Card, PageHeader, StatCard } from '../../components/ui';

export default function Dashboard() {
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [profs, setProfs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [e, c, p] = await Promise.all([
          api.fetchEleves_admin().catch(() => []),
          api.fetchClasses().catch(() => []),
          api.fetchProfesseurs().catch(() => []),
        ]);
        if (!active) return;
        setEleves(Array.isArray(e) ? e : []);
        setClasses(Array.isArray(c) ? c : []);
        setProfs(Array.isArray(p) ? p : []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const stats = [
    { label: 'Eleves', value: eleves.length, trend: 'Inscrits', icon: Users, tone: 'blue' },
    { label: 'Enseignants', value: profs.length, trend: 'Actifs', icon: GraduationCap, tone: 'emerald' },
    { label: 'Classes', value: classes.length, trend: "De l'etablissement", icon: School, tone: 'slate' },
  ];

  const effectifs = useMemo(() => {
    const byClass = new Map();
    eleves.forEach((e) => byClass.set(e.classe_id ?? null, (byClass.get(e.classe_id ?? null) || 0) + 1));
    return classes.map((c) => ({
      id: c.id,
      name: c.nom_personnalise || c.nom || `Classe ${c.id}`,
      count: byClass.get(c.id) || 0,
    }));
  }, [classes, eleves]);

  const recents = eleves.slice(-5).reverse();

  return (
    <>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble de l'etablissement." breadcrumb="Accueil / Dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => <StatCard key={item.label} {...item} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Dernieres inscriptions</h2>
            <Badge tone="blue">{eleves.length} eleves</Badge>
          </div>
          {recents.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              {loading ? 'Chargement...' : 'Aucun eleve inscrit pour le moment.'}
            </p>
          ) : (
            <div className="space-y-3">
              {recents.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <div>
                    <p className="font-semibold">{[s.nom, s.prenom].filter(Boolean).join(' ') || 'Eleve'}</p>
                    <p className="text-sm text-slate-500">{s.matricule || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-bold">Effectifs par classe</h2>
          {effectifs.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              {loading ? 'Chargement...' : 'Aucune classe creee pour le moment.'}
            </p>
          ) : (
            <div className="space-y-4">
              {effectifs.map((item) => (
                <div key={item.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{item.name}</span>
                    <strong>{item.count} eleves</strong>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(item.count, 60) * 1.5}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

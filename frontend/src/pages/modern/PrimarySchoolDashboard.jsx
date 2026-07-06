import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, ClipboardList, GraduationCap, School, UserPlus, Users,
} from 'lucide-react';
import * as api from '../../api/api';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import { Badge, Button, Card, PageHeader, StatCard } from '../../components/ui';
import { primaryLevelOrder } from '../../utils/primarySchool';
import { classRow } from './operations/shared';

export default function PrimarySchoolDashboard() {
  const { labels: ui } = useEstablishmentProfile();
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [profs, setProfs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.fetchEleves_admin().catch(() => []),
      api.fetchClasses().catch(() => []),
      api.fetchProfesseurs().catch(() => []),
    ]).then(([e, c, p]) => {
      if (!active) return;
      setEleves(Array.isArray(e) ? e : []);
      setClasses(Array.isArray(c) ? c.map(classRow) : []);
      setProfs(Array.isArray(p) ? p : []);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const effectifs = useMemo(() => {
    const byClass = new Map();
    eleves.forEach((e) => byClass.set(e.classe_id ?? null, (byClass.get(e.classe_id ?? null) || 0) + 1));
    return [...classes]
      .map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level_code || c.level,
        section: c.subsystem_code,
        count: byClass.get(c.id) || 0,
        capacity: Number(c.capacity) || 0,
      }))
      .sort((a, b) => primaryLevelOrder(a.level) - primaryLevelOrder(b.level));
  }, [classes, eleves]);

  const byLevel = useMemo(() => {
    const acc = {};
    effectifs.forEach((row) => {
      acc[row.level] = (acc[row.level] || 0) + row.count;
    });
    return acc;
  }, [effectifs]);

  const recents = eleves.slice(-5).reverse();
  const totalCapacity = effectifs.reduce((s, r) => s + (r.capacity || 0), 0);

  const shortcuts = [
    { to: '/app/students/nouveau', label: ui.enrollment, icon: UserPlus, tone: 'bg-blue-100 text-blue-700' },
    { to: '/app/classes/nouveau', label: 'Nouvelle classe', icon: School, tone: 'bg-emerald-100 text-emerald-700' },
    { to: '/app/grades', label: ui.grades, icon: BarChart3, tone: 'bg-violet-100 text-violet-700' },
    { to: '/app/promotions', label: ui.promotions, icon: ClipboardList, tone: 'bg-amber-100 text-amber-700' },
  ];

  return (
    <>
      <PageHeader
        title="Tableau de bord — École primaire"
        description="Vue d'ensemble des classes, effectifs et inscriptions (SIL → CM2)."
        breadcrumb="Accueil / Primaire"
      />

      <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Section <strong>école primaire</strong> — gestion des niveaux SIL, CP, CE1… CM2
        (francophone) et Class 1→6 (anglophone).
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={ui.dashboardStudents} value={loading ? '…' : eleves.length} trend="Inscrits" icon={Users} tone="blue" />
        <StatCard label={ui.dashboardClasses} value={loading ? '…' : classes.length} trend="Actives" icon={School} tone="emerald" />
        <StatCard label={ui.teachers} value={loading ? '…' : profs.length} trend="Enseignants" icon={GraduationCap} tone="slate" />
        <StatCard
          label="Places totales"
          value={loading ? '…' : totalCapacity || '—'}
          trend={`${eleves.length} élèves inscrits`}
          icon={Users}
          tone="violet"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-bold">Accès rapide</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {shortcuts.map(({ to, label, icon: Icon, tone }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                  <Icon size={18} />
                </span>
                {label}
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{ui.recentEnrollment}</h2>
            <Badge tone="blue">{eleves.length}</Badge>
          </div>
          {recents.length === 0 ? (
            <p className="text-sm text-slate-500">{loading ? 'Chargement…' : 'Aucune inscription récente.'}</p>
          ) : (
            <div className="space-y-2">
              {recents.map((s) => (
                <div key={s.id} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <span className="font-medium">{[s.nom, s.prenom].filter(Boolean).join(' ') || `ID ${s.id}`}</span>
                  <span className="text-slate-500">{s.matricule || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-bold">Effectifs par niveau</h2>
          {Object.keys(byLevel).length === 0 ? (
            <p className="text-sm text-slate-500">{loading ? 'Chargement…' : 'Aucune classe créée.'}</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byLevel)
                .sort(([a], [b]) => primaryLevelOrder(a) - primaryLevelOrder(b))
                .map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-semibold">{level}</span>
                    <span>{count} élève(s)</span>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-bold">{ui.effectifs}</h2>
          {effectifs.length === 0 ? (
            <p className="text-sm text-slate-500">{loading ? 'Chargement…' : 'Créez une classe pour commencer.'}</p>
          ) : (
            <div className="space-y-4">
              {effectifs.map((item) => (
                <div key={item.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{item.name} <span className="text-slate-400">({item.level})</span></span>
                    <strong>{item.count}{item.capacity ? ` / ${item.capacity}` : ''}</strong>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-emerald-600"
                      style={{
                        width: `${item.capacity ? Math.min(100, (item.count / item.capacity) * 100) : Math.min(item.count * 3, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link to="/app/classes/nouveau" className="mt-4 inline-block">
            <Button variant="secondary" className="text-sm">
              <School size={16} /> Nouvelle classe
            </Button>
          </Link>
        </Card>
      </div>
    </>
  );
}

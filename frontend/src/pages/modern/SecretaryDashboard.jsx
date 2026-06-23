import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, WalletCards, CalendarDays } from 'lucide-react';
import * as api from '../../api/api';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import { Badge, Card, PageHeader, StatCard } from '../../components/ui';

export default function SecretaryDashboard() {
  const { labels: ui } = useEstablishmentProfile();
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [treasury, setTreasury] = useState(null);
  const [planning, setPlanning] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.fetchEleves_admin().catch(() => []),
      api.fetchClasses().catch(() => []),
      api.fetchTresorerieStats().catch(() => null),
      api.fetchPlanningSemaine().catch(() => ({ jours: {} })),
    ]).then(([e, c, t, p]) => {
      if (!active) return;
      setEleves(Array.isArray(e) ? e : []);
      setClasses(Array.isArray(c) ? c : []);
      setTreasury(t);
      setPlanning(p);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const slotCount = Object.values(planning?.jours || {}).flat().length;

  const recents = eleves.slice(-5).reverse();
  const shortcuts = [
    { to: '/secretary/students/nouveau', label: ui.enrollment, icon: ClipboardList, className: 'bg-blue-100 text-blue-700' },
    { to: '/secretary/students', label: ui.studentsList, icon: Users, className: 'bg-emerald-100 text-emerald-700' },
    { to: '/secretary/payments', label: 'Paiements', icon: WalletCards, className: 'bg-slate-100 text-slate-700' },
    { to: '/secretary/schedules', label: 'Planning', icon: CalendarDays, className: 'bg-violet-100 text-violet-700' },
  ];

  return (
    <>
      <PageHeader
        title="Tableau de bord secrétariat"
        description={`Vue d'accueil — inscriptions, ${ui.students.toLowerCase()} et suivi administratif.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={ui.dashboardStudents} value={loading ? '…' : eleves.length} trend="Inscrits" icon={Users} tone="blue" />
        <StatCard label={ui.dashboardClasses} value={loading ? '…' : classes.length} trend="Actifs" icon={ClipboardList} tone="emerald" />
        <StatCard
          label="Paiements en attente"
          value={loading ? '…' : (treasury?.pending_count ?? 0)}
          trend={treasury ? `${Number(treasury.pending_amount || 0).toLocaleString('fr-FR')} XAF` : '—'}
          icon={WalletCards}
          tone="amber"
        />
        <StatCard
          label="Créneaux planifiés"
          value={loading ? '…' : slotCount}
          trend="Cette semaine"
          icon={CalendarDays}
          tone="violet"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-bold">Accès rapide</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {shortcuts.map(({ to, label, icon: Icon, className }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${className}`}>
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
            <p className="text-sm text-slate-500">{loading ? 'Chargement…' : `Aucun ${ui.student.toLowerCase()} inscrit.`}</p>
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
    </>
  );
}

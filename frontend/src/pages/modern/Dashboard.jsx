
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock, GraduationCap, School, Sparkles, Star, UserRound, Users } from 'lucide-react';
import * as api from '../../api/api';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import { Badge, Card, PageHeader } from '../../components/ui';

// Dégradés par "tone", cohérents avec l'identité bleu encre / or du reste de l'app
const TONE_STYLES = {
  blue: 'from-blue-500 to-indigo-600',
  emerald: 'from-emerald-500 to-teal-600',
  slate: 'from-[#101F3C] to-[#1f3a63]',
  gold: 'from-amber-400 to-[#E8C579]',
};

// Compteur animé simple, sans dépendance externe
function useCountUp(target, active) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    if (!active || typeof target !== 'number') {
      setValue(typeof target === 'number' ? target : 0);
      return;
    }
    const duration = 900;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, active]);

  return value;
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} />;
}

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>
      <Skeleton className="mt-4 h-2.5 w-24" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2 rounded-xl border border-slate-100 bg-white p-3">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function BarSkeleton() {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-2.5 w-full rounded-full" />
    </div>
  );
}

function KpiTile({ label, value, context, icon: Icon, tone, delay, ready }) {
  const display = useCountUp(typeof value === 'number' ? value : null, ready);
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-700 ease-out motion-reduce:transition-none hover:-translate-y-1 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-900/10 ${
        ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Halo décoratif */}
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${TONE_STYLES[tone]} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
      />
      {/* Effet de reflet au survol */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
      />

      <div className="relative flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${TONE_STYLES[tone]} text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-950">
            {typeof value === 'number' ? display : value}
          </p>
        </div>
      </div>
      <p className="relative mt-3 text-xs font-medium text-slate-400">{context}</p>

      {/* Barre d'accent qui se déploie au survol */}
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-[3px] w-0 bg-gradient-to-r ${TONE_STYLES[tone]} transition-all duration-300 group-hover:w-full`}
      />
    </div>
  );
}

export default function Dashboard() {
  const { labels: ui } = useEstablishmentProfile();
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [profs, setProfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(new Date());

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

  // Petit délai pour laisser l'entrée animée se jouer une fois les données prêtes
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setReady(true), 30);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Horloge légère pour l'en-tête (mise à jour minute par minute, pas de sur-render)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const formattedDate = useMemo(
    () => now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    [now],
  );

  const occupationMoyenne = classes.length > 0 ? (eleves.length / classes.length).toFixed(1) : '—';

  const stats = [
    { label: ui.dashboardStudents, value: eleves.length, context: 'Inscrits au total', icon: Users, tone: 'blue' },
    { label: ui.teachers, value: profs.length, context: 'Actifs cette année', icon: GraduationCap, tone: 'emerald' },
    { label: ui.dashboardClasses, value: classes.length, context: "De l'établissement", icon: School, tone: 'slate' },
    { label: 'Occupation moyenne', value: occupationMoyenne, context: 'Élèves par classe', icon: Sparkles, tone: 'gold' },
  ];

  const effectifs = useMemo(() => {
    const byClass = new Map();
    eleves.forEach((e) => byClass.set(e.classe_id ?? null, (byClass.get(e.classe_id ?? null) || 0) + 1));
    const rows = classes.map((c) => ({
      id: c.id,
      name: c.nom_personnalise || c.nom || `${ui.class} ${c.id}`,
      count: byClass.get(c.id) || 0,
    }));
    const max = Math.max(1, ...rows.map((r) => r.count));
    return rows.sort((a, b) => b.count - a.count).map((r) => ({ ...r, pct: (r.count / max) * 100 }));
  }, [classes, eleves, ui.class]);

  const recents = eleves.slice(-5).reverse();

  return (
    <>
      {/* Bandeau décoratif derrière l'en-tête existant, sans toucher à son style interne */}
      <div className="relative">
        <div className="pointer-events-none absolute -left-10 -top-16 -z-10 h-56 w-56 rounded-full bg-gradient-to-br from-[#101F3C]/15 to-[#E8C579]/25 blur-3xl" />
        <div
          className={`flex flex-wrap items-start justify-between gap-3 transition-all duration-500 motion-reduce:transition-none ${
            ready || !loading ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
          }`}
        >
          <PageHeader title="Tableau de bord" description={ui.dashboardDesc} breadcrumb="Accueil / Dashboard" />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-3 py-1.5 text-xs font-medium capitalize text-slate-500 shadow-sm">
              <CalendarDays size={13} className="text-slate-400" />
              {formattedDate}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Données en direct
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          : stats.map((item, i) => <KpiTile key={item.label} {...item} delay={i * 90} ready={ready} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{ui.recentEnrollment}</h2>
            {!loading && <Badge tone="blue">{eleves.length} {ui.students.toLowerCase()}</Badge>}
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}
            </div>
          ) : recents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
              <UserRound className="text-slate-300" size={28} />
              <p className="text-sm text-slate-500">Aucun {ui.students.toLowerCase()} inscrit pour le moment.</p>
            </div>
          ) : (
            <ul className="relative space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
              {recents.map((s, i) => {
                const fullName = [s.prenom, s.nom].filter(Boolean).join(' ') || 'Élève';
                const initials = `${s.prenom?.[0] || ''}${s.nom?.[0] || ''}`.toUpperCase() || '?';
                const isNewest = i === 0;
                return (
                  <li
                    key={s.id}
                    className={`relative flex items-center gap-3 pl-0 transition-all duration-500 motion-reduce:transition-none ${
                      ready ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
                    }`}
                    style={{ transitionDelay: `${150 + i * 70}ms` }}
                  >
                    <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#101F3C] to-[#1f3a63] text-xs font-bold text-[#F3D68A] shadow-sm">
                      {isNewest && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8C579]/40 motion-reduce:animate-none" />
                      )}
                      <span className="relative">{initials === '?' ? <UserRound size={16} /> : initials}</span>
                    </span>
                    <div className="group flex min-w-0 flex-1 items-center justify-between rounded-xl border border-slate-100 bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{fullName}</p>
                        <p className="text-sm text-slate-500">{s.matricule || '—'}</p>
                      </div>
                      {isNewest && <Badge tone="gold">Nouveau</Badge>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-bold">{ui.effectifs}</h2>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <BarSkeleton key={i} />)}
            </div>
          ) : effectifs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
              <School className="text-slate-300" size={28} />
              <p className="text-sm text-slate-500">Aucune {ui.class.toLowerCase()} créée pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {effectifs.map((item, i) => {
                const isTop = i === 0 && item.count > 0;
                return (
                  <div key={item.id} className="group">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        {item.name}
                        {isTop && <Star size={13} className="fill-[#E8C579] text-[#E8C579]" />}
                      </span>
                      <strong className="text-slate-900 transition-transform duration-200 group-hover:scale-105">
                        {item.count} {ui.students.toLowerCase()}
                      </strong>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-2.5 rounded-full bg-gradient-to-r transition-all duration-700 ease-out motion-reduce:transition-none ${
                          isTop ? 'from-amber-400 to-[#E8C579]' : 'from-[#101F3C] to-[#2f5fd1]'
                        }`}
                        style={{ width: ready ? `${item.pct}%` : '0%', transitionDelay: `${120 + i * 60}ms` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

import { AlertTriangle, CalendarDays, ClipboardCheck, GraduationCap, Receipt, School, Users, WalletCards } from 'lucide-react';
import { activities, classes, payments, schedule, stats, students } from '../../data/mockSchool';
import { Badge, Card, PageHeader, StatCard } from '../../components/ui';

const icons = [Users, GraduationCap, School, WalletCards, ClipboardCheck, AlertTriangle];

export default function Dashboard() {
  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'activite scolaire, administrative et financiere de l'etablissement."
        breadcrumb="Accueil / Dashboard"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item, index) => <StatCard key={item.label} {...item} icon={icons[index]} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Dernieres inscriptions</h2>
            <Badge tone="blue">{students.length} recents</Badge>
          </div>
          <div className="space-y-3">
            {students.slice(0, 4).map((student) => (
              <div key={student.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                <div>
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-sm text-slate-500">{student.matricule} - {student.className}</p>
                </div>
                <Badge tone={student.payment === 'A jour' ? 'emerald' : student.payment === 'Partiel' ? 'amber' : 'rose'}>{student.payment}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-bold">Alertes importantes</h2>
          <div className="space-y-3">
            <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">12 paiements en retard cette semaine.</div>
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">3 classes sans professeur principal.</div>
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">Conseil de classe prevu vendredi.</div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><CalendarDays size={18} /> Prochains cours</h2>
          <div className="space-y-3">
            {schedule.slice(0, 3).map((item) => (
              <div key={`${item.day}-${item.time}`} className="rounded-xl border border-slate-100 p-3">
                <p className="font-semibold">{item.course}</p>
                <p className="text-sm text-slate-500">{item.day}, {item.time} - {item.className}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><Receipt size={18} /> Paiements recents</h2>
          <div className="space-y-3">
            {payments.map((item) => (
              <div key={item.student} className="flex justify-between rounded-xl border border-slate-100 p-3">
                <span>
                  <p className="font-semibold">{item.student}</p>
                  <p className="text-sm text-slate-500">{item.amount}</p>
                </span>
                <Badge tone={item.status === 'Payé' ? 'emerald' : item.status === 'Partiel' ? 'amber' : 'rose'}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-bold">Activite recente</h2>
          <div className="space-y-3">
            {activities.map((activity) => <p key={activity} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{activity}</p>)}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-bold">Effectifs par classe</h2>
          <div className="space-y-4">
            {classes.map((item) => (
              <div key={item.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.name}</span>
                  <strong>{item.students} eleves</strong>
                </div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(item.students, 60) * 1.5}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-bold">Performance globale</h2>
          <div className="grid grid-cols-3 gap-3">
            {['Moyenne: 13.8', 'Reussite: 78%', 'Retards: 21'].map((item) => <div key={item} className="rounded-xl bg-slate-50 p-4 text-center text-sm font-semibold">{item}</div>)}
          </div>
        </Card>
      </div>
    </>
  );
}

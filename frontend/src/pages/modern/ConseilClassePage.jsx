import { useCallback, useEffect, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, DataTable, Input, PageHeader, Select } from '../../components/ui';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import { CONSEIL_DECISIONS, conseilDecisionLabel } from '../../utils/vieScolaire';

export default function ConseilClassePage() {
  const { schoolName, periodOptions } = useEstablishmentProfile();
  const [classes, setClasses] = useState([]);
  const [classeId, setClasseId] = useState('');
  const [trimestre, setTrimestre] = useState('1');
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.fetchClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const data = await api.fetchConseils(classeId || null);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setNotice(err.message);
    }
  }, [classeId]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  async function createSession() {
    if (!classeId) {
      setNotice('Choisissez une classe.');
      return;
    }
    setSaving(true);
    try {
      const created = await api.createConseil({
        classe_id: Number(classeId),
        trimestre: Number(trimestre),
        held_on: new Date().toISOString().slice(0, 10),
      });
      setSession(created);
      setNotice('Conseil préparé (rangs/moyennes importés des bulletins si disponibles).');
      await loadSessions();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function openSession(id) {
    try {
      setSession(await api.fetchConseil(id));
      setNotice('');
    } catch (err) {
      setNotice(err.message);
    }
  }

  function patchDecision(eleveId, patch) {
    setSession((cur) => {
      if (!cur) return cur;
      return {
        ...cur,
        decisions: cur.decisions.map((d) => (d.eleve_id === eleveId ? { ...d, ...patch } : d)),
      };
    });
  }

  async function saveDecisions() {
    if (!session) return;
    setSaving(true);
    try {
      const updated = await api.updateConseilDecisions(
        session.id,
        session.decisions.map((d) => ({
          eleve_id: d.eleve_id,
          rang: d.rang,
          moyenne: d.moyenne,
          mention: d.mention,
          decision: d.decision,
          observation: d.observation,
        })),
      );
      setSession(updated);
      setNotice('Décisions enregistrées.');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function validate() {
    if (!session) return;
    if (!window.confirm('Valider le conseil ? Les décisions seront verrouillées.')) return;
    setSaving(true);
    try {
      await saveDecisions();
      const updated = await api.validerConseil(session.id);
      setSession(updated);
      setNotice('Conseil validé.');
      await loadSessions();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSaving(false);
    }
  }

  const termChoices = ((periodOptions && periodOptions.length)
    ? periodOptions
    : [
      { value: '1', label: 'Trimestre 1' },
      { value: '2', label: 'Trimestre 2' },
      { value: '3', label: 'Trimestre 3' },
    ]).filter((t) => String(t.value || t) !== 'annual');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Conseil de classe"
        description="Délibérations : rang, mention, décision (Admis / Redouble / …) et PV imprimable."
      />
      {notice && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{notice}</p>}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Classe</label>
          <Select value={classeId} onChange={(e) => setClasseId(e.target.value)}>
            <option value="">Choisir…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.nom || c.nom_personnalise}</option>
            ))}
          </Select>
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Période</label>
          <Select value={trimestre} onChange={(e) => setTrimestre(e.target.value)}>
            {termChoices.map((t) => (
              <option key={t.value || t.id || t} value={t.value || t.id || t}>
                {t.label || t.name || `T${t.value || t}`}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={createSession} disabled={saving || !classeId}>
          <Plus size={16} /> Préparer le conseil
        </Button>
      </div>

      {sessions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => openSession(s.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                session?.id === s.id ? 'bg-[#101F3C] text-white ring-[#101F3C]' : 'bg-white text-slate-600 ring-slate-200'
              }`}
            >
              T{s.trimestre} · {s.statut} #{s.id}
            </button>
          ))}
        </div>
      )}

      {session && (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge tone={session.statut === 'VALIDE' ? 'emerald' : 'amber'}>{session.statut}</Badge>
            <Button variant="secondary" disabled={saving || session.statut === 'VALIDE'} onClick={saveDecisions}>
              Enregistrer
            </Button>
            <Button disabled={saving || session.statut === 'VALIDE'} onClick={validate}>Valider</Button>
            <Button
              variant="secondary"
              onClick={() => api.downloadConseilPv(session.id, schoolName).catch((e) => setNotice(e.message))}
            >
              <Download size={16} /> PV PDF
            </Button>
          </div>
          <DataTable
            title={session.titre || `Conseil T${session.trimestre}`}
            columns={[
              { key: 'eleve_nom', label: 'Élève' },
              { key: 'matricule', label: 'Matricule' },
              {
                key: 'rang',
                label: 'Rang',
                render: (row) => (
                  <Input
                    className="w-16"
                    type="number"
                    disabled={session.statut === 'VALIDE'}
                    value={row.rang ?? ''}
                    onChange={(e) => patchDecision(row.eleve_id, { rang: e.target.value ? Number(e.target.value) : null })}
                  />
                ),
              },
              {
                key: 'moyenne',
                label: 'Moyenne',
                render: (row) => (
                  <Input
                    className="w-20"
                    disabled={session.statut === 'VALIDE'}
                    value={row.moyenne ?? ''}
                    onChange={(e) => patchDecision(row.eleve_id, { moyenne: e.target.value })}
                  />
                ),
              },
              {
                key: 'mention',
                label: 'Mention',
                render: (row) => (
                  <Input
                    className="w-28"
                    disabled={session.statut === 'VALIDE'}
                    value={row.mention ?? ''}
                    onChange={(e) => patchDecision(row.eleve_id, { mention: e.target.value })}
                  />
                ),
              },
              {
                key: 'decision',
                label: 'Décision',
                render: (row) => (
                  <Select
                    disabled={session.statut === 'VALIDE'}
                    value={row.decision}
                    onChange={(e) => patchDecision(row.eleve_id, { decision: e.target.value })}
                  >
                    {CONSEIL_DECISIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </Select>
                ),
              },
              {
                key: 'observation',
                label: 'Observation',
                render: (row) => (
                  <Input
                    disabled={session.statut === 'VALIDE'}
                    value={row.observation ?? ''}
                    onChange={(e) => patchDecision(row.eleve_id, { observation: e.target.value })}
                  />
                ),
              },
              {
                key: 'decision_badge',
                label: '',
                render: (row) => <Badge tone="slate">{conseilDecisionLabel(row.decision)}</Badge>,
              },
            ]}
            rows={(session.decisions || []).map((d) => ({ ...d, id: d.eleve_id }))}
            emptyMessage="Aucune décision."
          />
        </>
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, GraduationCap } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Button, DataTable, EmptyState, Select } from '../../components/ui';
import { useEstablishmentProfile } from '../../hooks/useEstablishmentProfile';
import {
  LC_PROMOTION_DECISIONS,
  LC_TYPE,
  cecrlLevelName,
  lcGroupsAtLevel,
  nextCecrlLevel,
  suggestLcDestination,
} from '../../utils/languageCenter';
import { LC_SESSION_OPTIONS } from '../../utils/languageCenterEvaluations';
import { classRow } from './operations/shared';

function className(classe) {
  return classe?.name || classe?.nom || classe?.nom_personnalise || `Groupe ${classe?.id}`;
}

function Notice({ message, tone = 'emerald' }) {
  if (!message) return null;
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${tones[tone]}`}>{message}</div>;
}

function destOptionsForRow(row, sourceGroup, groups) {
  if (!sourceGroup || row.status === 'SORTANT') return [];
  if (row.status === 'REDOUBLE') {
    return lcGroupsAtLevel(groups, sourceGroup.level_code);
  }
  if (row.status === 'ADMIS') {
    const next = nextCecrlLevel(sourceGroup.level_code);
    return next ? lcGroupsAtLevel(groups, next) : [];
  }
  return groups;
}

function buildPromotionItem(row, groups) {
  const dest = groups.find((g) => String(g.id) === String(row.dest_classe_id));
  const item = {
    eleve_id: row.id,
    status: row.status,
    dest_classe_id: row.status === 'SORTANT' ? null : Number(row.dest_classe_id),
  };
  if (dest?.level_code && row.status !== 'SORTANT') {
    item.new_level_code = dest.level_code;
  }
  return item;
}

export default function LanguageCenterPromotionsPanel({ onApply, applying }) {
  const { labels: ui } = useEstablishmentProfile();
  const [groups, setGroups] = useState([]);
  const [sourceId, setSourceId] = useState('');
  const [session, setSession] = useState(3);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [bulkDest, setBulkDest] = useState('');

  useEffect(() => {
    api.fetchClasses({ type: LC_TYPE })
      .then((data) => setGroups((data || []).map(classRow)))
      .catch(() => setGroups([]));
  }, []);

  const sourceGroup = groups.find((g) => String(g.id) === String(sourceId));
  const nextLevel = sourceGroup ? nextCecrlLevel(sourceGroup.level_code) : null;

  const loadStudents = useCallback(async (groupeId, suggestedDestId = '', sourceLevel = '') => {
    if (!groupeId) {
      setRows([]);
      return;
    }
    const src = groups.find((g) => String(g.id) === String(groupeId));
    const level = sourceLevel || src?.level_code;
    const next = level ? nextCecrlLevel(level) : null;
    setLoading(true);
    setNotice(null);
    try {
      const eleves = await api.getClassEleves(groupeId);
      const defaultStatus = next ? 'ADMIS' : 'SORTANT';
      setRows(eleves.map((e) => ({
        id: e.id,
        name: [e.nom, e.prenom].filter(Boolean).join(' ') || e.name || `Apprenant ${e.id}`,
        matricule: e.matricule || `APP-${e.id}`,
        level_code: e.level_code || level,
        status: defaultStatus,
        dest_classe_id: defaultStatus === 'SORTANT' ? '' : suggestedDestId,
      })));
      if (!next && eleves.length) {
        setNotice({
          message: `Niveau ${level} — parcours terminé (C2). Les apprenants sont marqués « fin de parcours » par défaut.`,
          tone: 'amber',
        });
      }
    } catch (err) {
      setRows([]);
      setNotice({ message: err.message || 'Impossible de charger les apprenants.', tone: 'rose' });
    } finally {
      setLoading(false);
    }
  }, [groups]);

  function onSourceChange(value) {
    setSourceId(value);
    const source = groups.find((g) => String(g.id) === String(value));
    const suggestion = suggestLcDestination(groups, source);
    setBulkDest(suggestion);
    loadStudents(value, suggestion, source?.level_code);
    if (suggestion) {
      const dest = groups.find((g) => String(g.id) === String(suggestion));
      setTimeout(() => setNotice({
        message: `Groupe proposé pour les validés : ${className(dest)} (${cecrlLevelName(dest?.level_code)}).`,
        tone: 'blue',
      }), 0);
    } else if (source && !nextCecrlLevel(source.level_code)) {
      setNotice({
        message: `Aucun niveau supérieur après ${source.level_code}. Utilisez « fin de parcours » ou un autre groupe.`,
        tone: 'amber',
      });
    }
  }

  function patchRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function applyBulkDest(value) {
    setBulkDest(value);
    setRows((prev) => prev.map((r) => (
      r.status === 'ADMIS' ? { ...r, dest_classe_id: value } : r
    )));
  }

  const stats = useMemo(() => {
    const acc = { ADMIS: 0, REDOUBLE: 0, SORTANT: 0 };
    rows.forEach((r) => { acc[r.status] = (acc[r.status] || 0) + 1; });
    return acc;
  }, [rows]);

  function validate() {
    return rows.filter(
      (r) => r.status !== 'SORTANT' && !r.dest_classe_id,
    );
  }

  async function submit() {
    const missing = validate();
    if (missing.length) {
      setNotice({
        message: `${missing.length} apprenant(s) sans groupe de destination.`,
        tone: 'rose',
      });
      return;
    }
    setNotice(null);
    try {
      const payload = {
        source_classe_id: Number(sourceId),
        items: rows.map((r) => buildPromotionItem(r, groups)),
      };
      const res = await onApply(payload);
      setNotice({
        message: `Passages appliqués : ${res.applied ?? rows.length} apprenant(s) — session ${session} clôturée.`,
        tone: 'emerald',
      });
      loadStudents(sourceId, bulkDest);
    } catch (err) {
      setNotice({ message: err.message || "Échec de l'application des passages.", tone: 'rose' });
    }
  }

  const columns = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'name', label: ui.student },
    {
      key: 'level',
      label: 'Niveau actuel',
      render: (row) => cecrlLevelName(row.level_code || sourceGroup?.level_code),
    },
    {
      key: 'status',
      label: 'Décision',
      render: (row) => (
        <Select
          value={row.status}
          className="min-w-[14rem]"
          onChange={(e) => {
            const status = e.target.value;
            let dest = row.dest_classe_id;
            if (status === 'SORTANT') dest = '';
            else if (status === 'REDOUBLE') dest = String(sourceId);
            else if (status === 'ADMIS') {
              dest = suggestLcDestination(groups, sourceGroup) || dest;
            }
            patchRow(row.id, { status, dest_classe_id: dest });
          }}
        >
          {LC_PROMOTION_DECISIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      ),
    },
    {
      key: 'dest',
      label: 'Groupe de destination',
      render: (row) => {
        if (row.status === 'SORTANT') {
          return <Badge tone="rose">Fin de parcours</Badge>;
        }
        const options = destOptionsForRow(row, sourceGroup, groups);
        return (
          <Select
            value={row.dest_classe_id}
            className="min-w-[12rem]"
            onChange={(e) => patchRow(row.id, { dest_classe_id: e.target.value })}
          >
            <option value="">— Choisir —</option>
            {options.map((g) => (
              <option key={g.id} value={g.id}>
                {className(g)} ({g.level_code})
              </option>
            ))}
          </Select>
        );
      },
    },
  ];

  return (
    <>
      <Notice message={notice?.message} tone={notice?.tone} />

      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Clôturez une <strong>session annuelle</strong> : les apprenants validés passent au niveau CECRL
        supérieur (ex. A1→A2). Ceux qui repassent restent au même niveau dans un autre groupe.
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Session clôturée</label>
          <Select value={session} onChange={(e) => setSession(Number(e.target.value))}>
            {LC_SESSION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Groupe d&apos;origine</label>
          <Select value={sourceId} onChange={(e) => onSourceChange(e.target.value)}>
            <option value="">— Sélectionner un groupe —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {className(g)} ({g.level_code})
              </option>
            ))}
          </Select>
        </div>
        {sourceGroup && (
          <div className="flex flex-col justify-end text-sm text-slate-600">
            <span>Niveau du groupe : <strong>{sourceGroup.level_code}</strong></span>
            {nextLevel ? (
              <span className="text-emerald-700">Niveau suivant : <strong>{nextLevel}</strong></span>
            ) : (
              <span className="text-amber-700">Dernier niveau du parcours</span>
            )}
          </div>
        )}
        {sourceId && rows.length > 0 && nextLevel && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Groupe par défaut (validés → {nextLevel})
            </label>
            <Select value={bulkDest} onChange={(e) => applyBulkDest(e.target.value)}>
              <option value="">— Appliquer à tous les validés —</option>
              {lcGroupsAtLevel(groups, nextLevel).map((g) => (
                <option key={g.id} value={g.id}>{className(g)}</option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone="emerald">{stats.ADMIS} validé(s)</Badge>
          <Badge tone="amber">{stats.REDOUBLE} à repasser</Badge>
          <Badge tone="rose">{stats.SORTANT} fin de parcours</Badge>
        </div>
      )}

      {!sourceId ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="Sélectionnez un groupe"
          description="Choisissez le groupe dont vous voulez clôturer la session et gérer les passages de niveau."
        />
      ) : loading ? (
        <EmptyState icon={GraduationCap} title="Chargement des apprenants…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Aucun apprenant dans ce groupe" />
      ) : (
        <DataTable
          title={`${rows.length} apprenant(s)`}
          description="Par défaut : validé avec passage au niveau supérieur. Ajustez individuellement si besoin."
          columns={columns}
          rows={rows}
        />
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={submit} disabled={!sourceId || !rows.length || applying}>
          <CheckCircle2 size={16} /> {applying ? 'Application…' : 'Appliquer les passages de niveau'}
        </Button>
      </div>
    </>
  );
}

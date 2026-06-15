import { useEffect, useState } from 'react';
import { Library, Lock } from 'lucide-react';
import * as api from '../../api/api';
import { Badge, Card, EmptyState, PageHeader } from '../../components/ui';

// §8 — Vue en lecture seule de l'arborescence officielle MINESEC (référentiel national).
// L'école ne peut pas la modifier : elle est gérée par l'admin plateforme.
export default function ReferentielPage() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.fetchReferentielTree()
      .then((data) => setTree(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Référentiel indisponible.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Référentiel MINESEC"
        breadcrumb="Structure Pédagogique"
        description="Arborescence officielle (sous-systèmes, types, cycles, niveaux, séries). Lecture seule — gérée par l'administrateur de la plateforme."
        actions={<Badge tone="slate"><Lock size={13} /> Lecture seule</Badge>}
      />

      {error && <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      {loading ? (
        <EmptyState icon={Library} title="Chargement du référentiel…" />
      ) : tree.length === 0 ? (
        <EmptyState icon={Library} title="Référentiel vide" description="Aucune donnée de référentiel n'a été chargée." />
      ) : (
        <div className="space-y-4">
          {tree.map((sub) => (
            <Card key={sub.code} className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{sub.name}</h2>
                <Badge tone={sub.code === 'ANGLOPHONE' ? 'cyan' : 'violet'}>{sub.code}</Badge>
              </div>
              <div className="space-y-3">
                {(sub.types || []).map((type) => (
                  <div key={type.code} className="rounded-lg border border-slate-100 p-3">
                    <p className="mb-2 text-sm font-bold text-slate-700">{type.name_fr}</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {(type.cycles || []).map((cycle) => (
                        <div key={cycle.code} className="rounded-lg bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{cycle.name_fr}</p>
                          <ul className="space-y-1.5">
                            {(cycle.levels || []).map((level) => (
                              <li key={level.code} className="text-sm text-slate-700">
                                <span className="font-semibold">{level.name}</span>
                                {level.exam && <Badge tone="amber">{level.exam}</Badge>}
                                {level.series?.length > 0 && (
                                  <span className="ml-1 text-xs text-slate-500">
                                    {level.series.map((s) => s.code).join(' · ')}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEleves, fetchBulletin } from '../api/api';
import './Dashboard.css';

const CATEGORIES = [
  { key: 'excellent', label: 'Excellents', emoji: '🏆', threshold: 16, colorVar: '--c-excellent' },
  { key: 'bien', label: 'Bien', emoji: '🙂', threshold: 12, colorVar: '--c-bien' },
  { key: 'moyen', label: 'Moyens', emoji: '📈', threshold: 10, colorVar: '--c-moyen' },
  { key: 'insuffisant', label: 'En difficulté', emoji: '⚠️', threshold: 0, colorVar: '--c-insuffisant' },
];

function classify(moyenne) {
  if (moyenne >= 16) return 'excellent';
  if (moyenne >= 12) return 'bien';
  if (moyenne >= 10) return 'moyen';
  return 'insuffisant';
}

export default function DashboardPage() {
  const [eleves, setEleves] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    moyenneGlobale: 0,
    notesCount: 0,
    excellent: 0,
    bien: 0,
    moyen: 0,
    insuffisant: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchEleves();
        setEleves(data);

        // Fetch des bulletins en parallèle plutôt qu'en séquentiel
        const bulletinsResults = await Promise.allSettled(
          data.map(el => fetchBulletin(el.id))
        );

        let totalMoy = 0;
        let count = 0;
        const buckets = { excellent: 0, bien: 0, moyen: 0, insuffisant: 0 };

        bulletinsResults.forEach(res => {
          if (res.status === 'fulfilled' && res.value?.details_notes?.length > 0) {
            const moy = res.value.moyenne_generale;
            totalMoy += moy;
            count++;
            buckets[classify(moy)]++;
          }
        });

        setStats({
          total: data.length,
          moyenneGlobale: count > 0 ? (totalMoy / count).toFixed(1) : '—',
          notesCount: count,
          ...buckets,
        });
      } catch (e) {
        console.error('Erreur de chargement du dashboard:', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const recentEleves = eleves.slice(-5).reverse();

  // Segments du donut, calculés à partir des données réelles (pas de valeurs fictives)
  const donutSegments = useMemo(() => {
    const total = stats.notesCount || 0;
    if (total === 0) return [];
    let cumulative = 0;
    return CATEGORIES.map(cat => {
      const value = stats[cat.key] || 0;
      const fraction = value / total;
      const start = cumulative;
      cumulative += fraction;
      return { ...cat, value, fraction, start };
    });
  }, [stats]);

  const CIRC = 2 * Math.PI * 46; // circonférence du cercle (r=46)

  return (
    <div className="dashboard-container">
      <header className="page-header fade-in">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Vue d'ensemble et performances statistiques</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/eleves')}>
          <span className="btn-icon">+</span> Nouvel élève
        </button>
      </header>

      {/* Grille des statistiques */}
      <section className="stat-grid">
        <div className="stat-card fade-in" style={{ animationDelay: '40ms' }}>
          <div className="stat-icon icon-blue">🎓</div>
          <div className="stat-content">
            <span className="stat-label">Élèves inscrits</span>
            <div className={`stat-value ${loading ? 'is-loading' : ''}`}>
              {loading ? <span className="skeleton skeleton-value" /> : stats.total}
            </div>
          </div>
        </div>

        <div className="stat-card fade-in" style={{ animationDelay: '110ms' }}>
          <div className="stat-icon icon-cyan">📊</div>
          <div className="stat-content">
            <span className="stat-label">Moyenne générale</span>
            <div className={`stat-value ${loading ? 'is-loading' : ''}`}>
              {loading ? (
                <span className="skeleton skeleton-value" />
              ) : (
                <>
                  {stats.moyenneGlobale} <span className="stat-unit">/20</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card fade-in" style={{ animationDelay: '180ms' }}>
          <div className="stat-icon icon-green">🏆</div>
          <div className="stat-content">
            <span className="stat-label">Excellents (≥16)</span>
            <div className={`stat-value ${loading ? 'is-loading' : ''}`}>
              {loading ? <span className="skeleton skeleton-value" /> : stats.excellent}
            </div>
          </div>
        </div>

        <div className="stat-card fade-in" style={{ animationDelay: '250ms' }}>
          <div className="stat-icon icon-orange">⚠️</div>
          <div className="stat-content">
            <span className="stat-label">En difficulté (&lt;10)</span>
            <div className={`stat-value ${loading ? 'is-loading' : ''}`}>
              {loading ? <span className="skeleton skeleton-value" /> : stats.insuffisant}
            </div>
          </div>
        </div>
      </section>

      {/* Répartition des moyennes — donut + légende, données réelles */}
      <section className="card card-chart fade-in" style={{ animationDelay: '300ms' }}>
        <div className="card-header">
          <h2>📈 Répartition des moyennes</h2>
          <span className="chart-caption">
            {stats.notesCount > 0
              ? `Sur ${stats.notesCount} bulletin${stats.notesCount > 1 ? 's' : ''} disponible${stats.notesCount > 1 ? 's' : ''}`
              : 'Aucun bulletin disponible'}
          </span>
        </div>

        {loading ? (
          <div className="chart-body">
            <div className="skeleton skeleton-donut" />
          </div>
        ) : donutSegments.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <div className="empty-state-icon">📭</div>
            <p>Les statistiques apparaîtront ici dès qu'un bulletin sera disponible.</p>
          </div>
        ) : (
          <div className="chart-body">
            <div className="donut-wrap">
              <svg viewBox="0 0 120 120" className="donut" role="img" aria-label="Répartition des moyennes par catégorie">
                <circle cx="60" cy="60" r="46" className="donut-track" />
                {donutSegments.map(seg => (
                  <circle
                    key={seg.key}
                    cx="60"
                    cy="60"
                    r="46"
                    className="donut-segment"
                    style={{
                      stroke: `var(${seg.colorVar})`,
                      strokeDasharray: `${seg.fraction * CIRC} ${CIRC}`,
                      strokeDashoffset: `${-seg.start * CIRC + CIRC / 4}`,
                    }}
                  />
                ))}
              </svg>
              <div className="donut-center">
                <span className="donut-center-value">{stats.moyenneGlobale}</span>
                <span className="donut-center-label">/20 moy.</span>
              </div>
            </div>

            <ul className="chart-legend">
              {donutSegments.map(seg => (
                <li key={seg.key} className="legend-row">
                  <span className="legend-dot" style={{ background: `var(${seg.colorVar})` }} />
                  <span className="legend-emoji" aria-hidden="true">{seg.emoji}</span>
                  <span className="legend-label">{seg.label}</span>
                  <span className="legend-value">{seg.value}</span>
                  <span className="legend-bar-track">
                    <span
                      className="legend-bar-fill"
                      style={{ width: `${seg.fraction * 100}%`, background: `var(${seg.colorVar})` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Section Tableau */}
      <section className="card card-table fade-in" style={{ animationDelay: '360ms' }}>
        <div className="card-header">
          <h2>🧑‍🎓 Derniers élèves inscrits</h2>
          <button className="btn btn-secondary-sm" onClick={() => navigate('/eleves')}>
            Voir tous ➔
          </button>
        </div>

        {loading ? (
          <div className="page-loader">
            <div className="spinner" />
          </div>
        ) : recentEleves.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <h3>Aucun élève enregistré</h3>
            <p>Commencez par enregistrer vos premiers élèves pour alimenter le dashboard.</p>
            <button className="btn btn-primary" onClick={() => navigate('/eleves')}>
              + Ajouter un élève
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom complet</th>
                  <th>Matricule</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentEleves.map(el => (
                  <tr key={el.id}>
                    <td className="col-id">#{el.id}</td>
                    <td className="col-name">
                      <span className="avatar" aria-hidden="true">
                        {(el.prenom?.[0] || '').toUpperCase()}
                        {(el.nom?.[0] || '').toUpperCase()}
                      </span>
                      {el.prenom} {el.nom}
                    </td>
                    <td>
                      <span className="badge badge-blue">{el.matricule}</span>
                    </td>
                    <td className="text-right">
                      <button
                        className="btn btn-ghost-sm"
                        onClick={() => navigate(`/bulletin?id=${el.id}`)}
                      >
                        📋 Bulletin
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
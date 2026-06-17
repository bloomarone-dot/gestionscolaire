import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEleves, fetchBulletin } from '../api/api';

export default function DashboardPage() {
  const [eleves, setEleves]   = useState([]);
  const [stats, setStats]     = useState({ total: 0, moyenneGlobale: 0, excellent: 0, insuffisant: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchEleves();
        setEleves(data);

        // Calculer les stats depuis les bulletins
        let totalMoy = 0, count = 0, excellent = 0, insuffisant = 0;
        for (const el of data) {
          try {
            const b = await fetchBulletin(el.id);
            if (b.details_notes.length > 0) {
              totalMoy += b.moyenne_generale;
              count++;
              if (b.moyenne_generale >= 16) excellent++;
              if (b.moyenne_generale < 10) insuffisant++;
            }
          } catch { /* élève sans note */ }
        }
        setStats({
          total: data.length,
          moyenneGlobale: count > 0 ? (totalMoy / count).toFixed(1) : '—',
          excellent,
          insuffisant,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const recentEleves = eleves.slice(-5).reverse();

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Vue d'ensemble de votre établissement</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/eleves')}>
          + Nouvel élève
        </button>
      </div>

      <div className="page-body">
        {/* Statistiques */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon blue">👨‍🎓</div>
            <div>
              <div className="stat-value">{loading ? '…' : stats.total}</div>
              <div className="stat-label">Élèves inscrits</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon cyan">📊</div>
            <div>
              <div className="stat-value">{loading ? '…' : stats.moyenneGlobale}</div>
              <div className="stat-label">Moyenne générale / 20</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">🏆</div>
            <div>
              <div className="stat-value">{loading ? '…' : stats.excellent}</div>
              <div className="stat-label">Élèves excellents (≥16)</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">⚠️</div>
            <div>
              <div className="stat-value">{loading ? '…' : stats.insuffisant}</div>
              <div className="stat-label">En difficulté (&lt;10)</div>
            </div>
          </div>
        </div>

        {/* Derniers élèves */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Derniers élèves inscrits</h2>
            <button className="btn btn-secondary" onClick={() => navigate('/eleves')}>
              Voir tous →
            </button>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : recentEleves.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <div className="empty-state-title">Aucun élève enregistré</div>
              <div className="empty-state-text">Commencez par ajouter des élèves.</div>
              <button className="btn btn-primary mt-16" onClick={() => navigate('/eleves')}>
                + Ajouter un élève
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nom complet</th>
                    <th>Matricule</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEleves.map(el => (
                    <tr key={el.id}>
                      <td className="text-muted">{el.id}</td>
                      <td style={{ fontWeight: 600 }}>{el.prenom} {el.nom}</td>
                      <td><span className="badge badge-blue">{el.matricule}</span></td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: '5px 12px' }}
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
        </div>
      </div>
    </>
  );
}

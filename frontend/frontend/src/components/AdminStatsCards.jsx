import '../styles/admin-stats.css';

export default function AdminStatsCards({ stats }) {
  return (
    <div className="admin-stats-grid">
      <div className="stat-card-admin">
        <div className="stat-icon">👨‍🏫</div>
        <div className="stat-content">
          <div className="stat-number">{stats.total_professeurs}</div>
          <div className="stat-label">Professeurs</div>
        </div>
      </div>

      <div className="stat-card-admin">
        <div className="stat-icon">📚</div>
        <div className="stat-content">
          <div className="stat-number">{stats.total_classes}</div>
          <div className="stat-label">Classes</div>
        </div>
      </div>

      <div className="stat-card-admin">
        <div className="stat-icon">👥</div>
        <div className="stat-content">
          <div className="stat-number">{stats.total_eleves}</div>
          <div className="stat-label">Élèves</div>
        </div>
      </div>

      <div className="stat-card-admin">
        <div className="stat-icon">📖</div>
        <div className="stat-content">
          <div className="stat-number">{stats.total_matieres}</div>
          <div className="stat-label">Matières</div>
        </div>
      </div>
    </div>
  );
}

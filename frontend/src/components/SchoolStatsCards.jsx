import '../styles/school-stats.css';

export default function SchoolStatsCards({ stats }) {
  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-icon">🏛️</div>
        <div className="stat-content">
          <div className="stat-number">{stats.total_schools}</div>
          <div className="stat-label">Total Établissements</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">✅</div>
        <div className="stat-content">
          <div className="stat-number">{stats.active_schools}</div>
          <div className="stat-label">Établissements Actifs</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">👥</div>
        <div className="stat-content">
          <div className="stat-number">{stats.total_users}</div>
          <div className="stat-label">Administrateurs</div>
        </div>
      </div>
    </div>
  );
}

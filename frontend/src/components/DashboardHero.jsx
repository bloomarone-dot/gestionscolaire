import '../styles/dashboard-shared.css';

export default function DashboardHero({
  greeting,
  title,
  subtitle,
  badge,
  stats = [],
  actions = [],
}) {
  return (
    <section className="dashboard-hero">
      <div className="dashboard-hero-bg" aria-hidden="true" />
      <div className="dashboard-hero-content">
        <div className="dashboard-hero-text">
          {greeting && <span className="dashboard-hero-greeting">{greeting}</span>}
          <h1 className="dashboard-hero-title">{title}</h1>
          {subtitle && <p className="dashboard-hero-subtitle">{subtitle}</p>}
          {badge && <span className="dashboard-hero-badge">{badge}</span>}
        </div>
        {actions.length > 0 && (
          <div className="dashboard-hero-actions">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`btn ${action.variant || 'btn-primary'}`}
                onClick={action.onClick}
              >
                {action.icon && <span>{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {stats.length > 0 && (
        <div className="dashboard-hero-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="dashboard-hero-stat">
              <span className="dashboard-hero-stat-value">{stat.value}</span>
              <span className="dashboard-hero-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

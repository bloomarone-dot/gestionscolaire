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
    <section className="card card-primary card-outline dashboard-hero">
      <div className="card-body">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start">
          <div>
            {greeting && <span className="text-primary text-uppercase font-weight-bold small">{greeting}</span>}
            <h2 className="h3 mb-2 mt-1">{title}</h2>
            {subtitle && <p className="text-muted mb-2">{subtitle}</p>}
            {badge && <span className="badge badge-light border">{badge}</span>}
          </div>

          {actions.length > 0 && (
            <div className="btn-group flex-wrap mt-3 mt-lg-0">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={`btn ${action.variant || 'btn-primary'}`}
                  onClick={action.onClick}
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {stats.length > 0 && (
          <div className="row mt-4">
            {stats.map((stat, index) => (
              <div key={stat.label} className="col-12 col-sm-6 col-xl-3">
                <div className="info-box mb-3">
                  <span className={`info-box-icon bg-${['info', 'success', 'warning', 'primary'][index % 4]}`}>
                    <i className="fas fa-chart-bar" />
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text">{stat.label}</span>
                    <span className="info-box-number">{stat.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

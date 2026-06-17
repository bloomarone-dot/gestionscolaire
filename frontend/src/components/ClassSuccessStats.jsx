export default function ClassSuccessStats({ classSuccess = [], trimestre = 1 }) {
  if (!classSuccess.length) {
    return (
      <section className="class-success-section">
        <h3>Taux de réussite par classe</h3>
        <p className="class-success-empty">Aucune classe enregistrée pour le moment.</p>
      </section>
    );
  }

  return (
    <section className="class-success-section">
      <div className="class-success-header">
        <h3>Taux de réussite par classe</h3>
        <span className="class-success-meta">Trimestre {trimestre} · seuil 10/20</span>
      </div>
      <div className="class-success-grid">
        {classSuccess.map((item) => {
          const rate = item.taux_reussite;
          const hasData = rate != null && item.eleves_evalues > 0;
          return (
            <div key={item.classe_id} className="class-success-card">
              <div className="class-success-card-top">
                <strong>{item.classe_nom}</strong>
                <span className={`class-success-rate ${hasData && rate >= 50 ? 'good' : hasData ? 'warn' : 'na'}`}>
                  {hasData ? `${rate}%` : '—'}
                </span>
              </div>
              <div className="class-success-bar" aria-hidden="true">
                <span style={{ width: hasData ? `${Math.min(rate, 100)}%` : '0%' }} />
              </div>
              <small>
                {hasData
                  ? `${item.admis}/${item.eleves_evalues} admis · ${item.effectif} élève(s)`
                  : `${item.effectif} élève(s) · notes insuffisantes`}
              </small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

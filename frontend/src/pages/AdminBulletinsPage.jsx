import * as api from '../api/api';
import BulletinModule from '../components/BulletinModule';

export default function AdminBulletinsPage() {
  return (
    <div className="admin-bulletins-page">
      <header className="section-header" style={{ marginBottom: '1rem' }}>
        <h2>Bulletins scolaires</h2>
        <p>Consultation par trimestre, classement de la classe et export CSV / Excel</p>
      </header>
      <BulletinModule
        loadClasses={() => api.fetchClasses()}
        loadEleves={(classeId) => api.fetchEleves_admin(classeId)}
      />
    </div>
  );
}

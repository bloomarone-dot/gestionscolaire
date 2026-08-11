import * as api from '../api/api';
import BulletinModule from '../components/BulletinModule';

export default function AdminBulletinsPage() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Bulletins scolaires</h3>
        <p className="card-text text-muted mb-0">Consultation par trimestre et classement de la classe.</p>
      </div>
      <div className="card-body">
        <BulletinModule
          loadClasses={() => api.fetchClasses()}
          loadEleves={(classeId) => api.fetchEleves_admin(classeId)}
        />
      </div>
    </div>
  );
}

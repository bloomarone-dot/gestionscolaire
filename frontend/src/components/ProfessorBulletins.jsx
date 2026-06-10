import * as api from '../api/api';
import BulletinModule from './BulletinModule';

export default function ProfessorBulletins() {
  return (
    <BulletinModule
      isProfessor
      loadClasses={() => api.getProfessorClasses()}
      loadEleves={(classeId) => api.getClassEleves(classeId)}
    />
  );
}

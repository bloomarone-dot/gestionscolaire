import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/api';
import SchoolList from '../components/SchoolList';
import CreateSchoolModal from '../components/CreateSchoolModal';
import SchoolStatsCards from '../components/SchoolStatsCards';
import '../styles/superadmin-dashboard.css';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const schoolsData = await api.fetchSchools();
      const validSchools = schoolsData.filter((s) => s?.id != null);
      setSchools(validSchools);
      setStats({
        total_schools: validSchools.length,
        active_schools: validSchools.filter((s) => s.is_active).length,
        total_users: validSchools.length,
      });
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSchoolCreated = (newSchool) => {
    if (newSchool?.id) {
      setSchools((prev) => [...prev.filter((s) => s.id !== newSchool.id), newSchool]);
      setStats((prev) => ({
        total_schools: (prev?.total_schools ?? 0) + 1,
        active_schools: (prev?.active_schools ?? 0) + (newSchool.is_active ? 1 : 0),
        total_users: (prev?.total_users ?? 0) + 1,
      }));
    } else {
      loadDashboardData();
    }
    setShowCreateModal(false);
  };

  const handleSchoolUpdated = (updatedSchool) => {
    setSchools((prev) =>
      prev.map((s) => (s.id === updatedSchool.id ? updatedSchool : s))
    );
  };

  const handleSchoolDeleted = (deletedSchoolId) => {
    setSchools((prev) => prev.filter((s) => s.id !== deletedSchoolId));
    setStats((prev) => ({
      total_schools: Math.max(0, (prev?.total_schools ?? 1) - 1),
      active_schools: Math.max(0, (prev?.active_schools ?? 1) - 1),
      total_users: Math.max(0, (prev?.total_users ?? 1) - 1),
    }));
  };

  if (!user || user.role !== 'superadmin') {
    return <div className="unauthorized">Accès non autorisé</div>;
  }

  return (
    <div className="superadmin-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Tableau de Bord Super Admin</h1>
          <p className="dashboard-subtitle">Bienvenue, {user.first_name}! Gérez vos établissements scolaires</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Créer un établissement
        </button>
      </div>

      {/* Statistiques */}
      {stats && <SchoolStatsCards stats={stats} />}

      {/* Liste des établissements */}
      <div className="schools-section">
        <h2>Mes Établissements</h2>
        {loading ? (
          <div className="loading-state">Chargement des établissements...</div>
        ) : schools.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3>Aucun établissement créé</h3>
            <p>Commencez par créer votre premier établissement</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Créer un établissement
            </button>
          </div>
        ) : (
          <SchoolList
            schools={schools}
            onSchoolDeleted={handleSchoolDeleted}
            onSchoolUpdated={handleSchoolUpdated}
          />
        )}
      </div>

      {/* Modal de création */}
      {showCreateModal && (
        <CreateSchoolModal
          onClose={() => setShowCreateModal(false)}
          onSchoolCreated={handleSchoolCreated}
        />
      )}
    </div>
  );
}

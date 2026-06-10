import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/api';
import '../styles/school-selector.css';

export default function SchoolSelector() {
  const { user, selectedSchool, switchSchool } = useAuth();
  const [schools, setSchools] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const loadSchools = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchSchools();
      setSchools(data);
      if (!selectedSchool && data.length > 0) {
        switchSchool(data[0]);
      }
    } catch (error) {
      console.error('Erreur chargement établissements:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSchool, switchSchool]);

  useEffect(() => {
    if (user?.role === 'superadmin') {
      loadSchools();
    }
  }, [user, loadSchools]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (user?.role !== 'superadmin') {
    return null;
  }

  const displaySchool = selectedSchool?.name || 'Sélectionner un établissement';

  return (
    <div className="school-selector" ref={containerRef}>
      <button
        type="button"
        className="school-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        title={displaySchool}
      >
        <span className="school-icon">🏛️</span>
        <span className="school-name">{displaySchool}</span>
        <span className="dropdown-arrow">▼</span>
      </button>

      {isOpen && (
        <div className="school-dropdown">
          {loading ? (
            <div className="dropdown-item loading">Chargement...</div>
          ) : schools.length === 0 ? (
            <div className="dropdown-item empty">Aucun établissement</div>
          ) : (
            schools.map((school) => (
              <button
                key={school.id}
                type="button"
                className={`dropdown-item ${selectedSchool?.id === school.id ? 'active' : ''}`}
                onClick={() => {
                  switchSchool(school);
                  setIsOpen(false);
                }}
              >
                <span className="school-item-name">{school.name}</span>
                <span className="school-item-city">{school.city}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

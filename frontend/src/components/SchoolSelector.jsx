import { useState, useEffect, useRef, useCallback } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import * as api from '../api/api';
import { establishmentKindLabel } from '../utils/establishmentKind';

function pickDefaultSchool(schools) {
  if (!schools.length) return null;
  const preferred = schools.find(
    (s) => s.code === 'RPA' || /royal\s*priesthood/i.test(s.name || ''),
  );
  return preferred || schools[0];
}

export default function SchoolSelector({ compact = false }) {
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
        switchSchool(pickDefaultSchool(data));
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

  const displaySchool = selectedSchool?.name || 'Choisir un établissement';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 ${compact ? 'max-w-[220px]' : 'max-w-xs'}`}
        onClick={() => setIsOpen(!isOpen)}
        title={displaySchool}
      >
        <Building2 size={16} className="shrink-0 text-blue-600" />
        {!compact && <span className="truncate">{displaySchool}</span>}
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 max-h-80 min-w-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Chargement...</div>
          ) : schools.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">Aucun établissement</div>
          ) : (
            schools.map((school) => (
              <button
                key={school.id}
                type="button"
                className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 ${
                  selectedSchool?.id === school.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  switchSchool(school);
                  setIsOpen(false);
                }}
              >
                <span className="block text-sm font-bold text-slate-900">{school.name}</span>
                <span className="block text-xs text-slate-500">
                  {establishmentKindLabel(school.establishment_kind)}
                  {school.city ? ` · ${school.city}` : (school.code ? ` · ${school.code}` : '')}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

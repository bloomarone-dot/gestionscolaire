import { useState, useCallback } from 'react';
import { login as apiLogin, loginProfessor as apiLoginProfessor } from '../api/api';
import { AuthContext } from './useAuth';
import { isValidAccessToken, purgeInvalidAuthSession, readStoredAccessToken } from '../utils/authToken';

function readStoredUser() {
  try {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed?.role === 'enseignant') parsed.role = 'professeur';
    return parsed;
  } catch {
    return null;
  }
}

function getAccessToken() {
  const token = readStoredAccessToken();
  return isValidAccessToken(token) ? token : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    purgeInvalidAuthSession();
    return readStoredUser();
  });

  const [selectedSchool, setSelectedSchool] = useState(() => {
    const stored = localStorage.getItem('selectedSchool');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    const userData = {
      id: data.id,
      username: data.username,
      role: data.role === 'enseignant' ? 'professeur' : data.role,
      school_id: data.school_id,
      first_name: data.first_name,
      last_name: data.last_name,
      token: data.access_token,
    };
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.role === 'superadmin') {
      localStorage.removeItem('selectedSchool');
      setSelectedSchool(null);
    }
    setUser(userData);
    return userData;
  }, []);

  const loginProfessor = useCallback(async (username, password, schoolId = null) => {
    const data = await apiLoginProfessor(username, password, schoolId);
    const userData = {
      id: data.id,
      username: data.username,
      role: data.role === 'enseignant' ? 'professeur' : data.role,
      school_id: data.school_id,
      first_name: data.first_name,
      last_name: data.last_name,
      token: data.access_token,
    };
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const loginDemo = useCallback((role = 'admin') => {
    if (!import.meta.env.DEV) {
      throw new Error('Mode démo indisponible en production.');
    }
    const isSuperAdmin = role === 'superadmin';
    const isProfessor = role === 'professeur';
    const userData = {
      id: isSuperAdmin ? 0 : isProfessor ? 2 : 1,
      username: isSuperAdmin ? 'demo-superadmin' : isProfessor ? 'demo-professeur' : 'demo-admin',
      role: isSuperAdmin ? 'superadmin' : isProfessor ? 'professeur' : 'admin',
      school_id: isSuperAdmin ? null : 1,
      tenant_id: isSuperAdmin ? null : 1,
      first_name: 'Demo',
      last_name: isSuperAdmin ? 'Superadmin' : isProfessor ? 'Professeur' : 'Admin',
      token: `demo-${isSuperAdmin ? 'superadmin' : isProfessor ? 'professeur' : 'admin'}-token`,
    };
    localStorage.setItem('access_token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedSchool');
    setUser(null);
    setSelectedSchool(null);
  }, []);

  const switchSchool = useCallback((school) => {
    localStorage.setItem('selectedSchool', JSON.stringify(school));
    setSelectedSchool(school);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginProfessor,
      loginDemo,
      logout,
      isAuthenticated: !!user && !!getAccessToken(),
      selectedSchool,
      switchSchool
    }}>
      {children}
    </AuthContext.Provider>
  );
}

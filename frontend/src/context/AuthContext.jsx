import { createContext, useContext, useState, useCallback } from 'react';
import { login as apiLogin, loginProfessor as apiLoginProfessor } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
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
      role: data.role,
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

  const loginProfessor = useCallback(async (username, password, schoolId = null) => {
    const data = await apiLoginProfessor(username, password, schoolId);
    const userData = {
      id: data.id,
      username: data.username,
      role: data.role,
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
      logout,
      isAuthenticated: !!user,
      selectedSchool,
      switchSchool
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


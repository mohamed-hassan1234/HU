import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const roleHome = {
  admin: '/admin',
  student: '/student',
  lecturer: '/lecturer',
  department_head: '/admin/reports',
  dean: '/admin/analytics'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('hucems_token')));

  useEffect(() => {
    const token = localStorage.getItem('hucems_token');
    if (!token) return;
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        setProfile(data.profile);
      })
      .catch(() => localStorage.removeItem('hucems_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (loginId, password) => {
    const { data } = await api.post('/auth/login', { loginId, password });
    localStorage.setItem('hucems_token', data.token);
    setUser(data.user);
    setProfile(data.profile);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('hucems_token');
    setUser(null);
    setProfile(null);
  };

  const value = useMemo(() => ({ user, profile, loading, login, logout }), [user, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { adminApi } from './api';
import { Admin } from '../types';

interface AdminAuthContextValue {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AdminAuthContextValue | undefined>(undefined);
const KEY = 'fh_admin_token';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(KEY);
    if (!token) { setLoading(false); return; }
    // Validate the token exists; decode for display.
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.type === 'admin') setAdmin({ id: payload.sub, name: payload.name, email: payload.email, role: payload.role });
      else localStorage.removeItem(KEY);
    } catch {
      localStorage.removeItem(KEY);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await adminApi.post('/auth.php?action=admin_login', { email, password });
    localStorage.setItem(KEY, data.token);
    setAdmin(data.admin);
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setAdmin(null);
  };

  return <Ctx.Provider value={{ admin, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAdminAuth must be inside AdminAuthProvider');
  return c;
}

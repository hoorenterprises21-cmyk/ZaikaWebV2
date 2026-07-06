import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';
import { Customer } from '../types';

interface AuthContextValue {
  customer: Customer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'fh_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth.php?action=me')
      .then(({ data }) => setCustomer(data.customer))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth.php?action=login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setCustomer(data.customer);
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    const { data } = await api.post('/auth.php?action=register', {
      name, email, phone, password,
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    setCustomer(data.customer);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setCustomer(null);
  };

  const refresh = async () => {
    const { data } = await api.get('/auth.php?action=me');
    setCustomer(data.customer);
  };

  return (
    <AuthContext.Provider value={{ customer, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

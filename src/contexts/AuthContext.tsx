import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  full_name: string;
  email: string;
  mobile_no: string;
  role: string;
  is_active: boolean;
  customer_id?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (mobileNo: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isCustomer: () => boolean;
  isFieldStaff: () => boolean;
  isBackendUser: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (mobileNo: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from('user_master_tbl')
        .select('id, full_name, email, mobile_no, password_hash, role, is_active')
        .eq('mobile_no', mobileNo)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Invalid credentials');
      if (data.password_hash !== password) throw new Error('Invalid credentials');

      let customerId = undefined;
      if (data.role === 'customer') {
        const { data: customerData } = await supabase
          .from('customer_master_tbl')
          .select('id')
          .eq('mobile_no', mobileNo)
          .maybeSingle();

        if (customerData) {
          customerId = customerData.id;
        }
      }

      const userSession: User = {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        mobile_no: data.mobile_no,
        role: data.role,
        is_active: data.is_active,
        customer_id: customerId,
      };

      setUser(userSession);
      localStorage.setItem('user', JSON.stringify(userSession));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const isAdmin = () => user?.role === 'admin';
  const isManager = () => user?.role === 'manager' || user?.role === 'admin';
  const isCustomer = () => user?.role === 'customer';
  const isFieldStaff = () => user?.role === 'field_staff';
  const isBackendUser = () => user?.role === 'backend_user';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager, isCustomer, isFieldStaff, isBackendUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

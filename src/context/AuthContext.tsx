import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// Define our own simple Admin User type (not the Supabase Auth User)
interface AdminUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on load
  useEffect(() => {
    const storedUser = localStorage.getItem('onium_admin_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('onium_admin_user');
      }
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Manual Query to the 'admins' table
      const { data, error } = await supabase
        .from('admins')
        .select('id, email')
        .eq('email', email)
        .eq('password', password) // Checking against the hardcoded password
        .single();

      if (error || !data) {
        return { error: 'Invalid admin credentials' };
      }

      // Success: Save to state and local storage
      const adminUser = { id: data.id, email: data.email };
      setUser(adminUser);
      localStorage.setItem('onium_admin_user', JSON.stringify(adminUser));
      
      return { error: null };
    } catch (err) {
      return { error: 'Login failed' };
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('onium_admin_user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
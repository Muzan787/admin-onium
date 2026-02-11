import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// Define our own simple Admin User type
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

  useEffect(() => {
    // 1. Check for an active session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
      }
      setIsLoading(false);
    });

    // 2. Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // 1. Authenticate with Supabase Auth (Secure)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { error: authError.message };
      }
      
      // 2. (Optional) Double-check against your 'admins' table
      // This ensures that even if someone signs up via Supabase Auth, 
      // they must also be in your 'admins' whitelist to get access.
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id, email')
        .eq('email', email)
        .single();

      if (adminError || !adminData) {
        // User logged in but not authorized as admin -> Log them out immediately
        await supabase.auth.signOut();
        return { error: 'Not an authorized admin' };
      }

      // Success: The onAuthStateChange listener above will update the state
      return { error: null };
    } catch (err) {
      console.error('Sign in error:',err);
      return { error: 'Login failed' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
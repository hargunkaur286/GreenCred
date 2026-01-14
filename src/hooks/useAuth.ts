import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'borrower' | 'verifier' | 'lender' | 'admin';
  organization_name: string | null;
}

interface Borrower {
  id: string;
  user_id: string;
  name: string;
  sector: string;
  country: string;
  size: 'small' | 'medium' | 'large';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Defer profile fetch to avoid deadlock
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setBorrower(null);
        setLoading(false);
      }
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (profileData) {
        setProfile(profileData as Profile);
        
        // If borrower, fetch their company
        if (profileData.role === 'borrower') {
          const { data: borrowerData } = await supabase
            .from('borrowers')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          
          setBorrower(borrowerData as Borrower | null);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setBorrower(null);
  };

  const refetchBorrower = async () => {
    if (user) {
      const { data: borrowerData } = await supabase
        .from('borrowers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setBorrower(borrowerData as Borrower | null);
    }
  };

  return {
    user,
    session,
    profile,
    borrower,
    loading,
    signOut,
    refetchBorrower,
    isAuthenticated: !!user,
    isBorrower: profile?.role === 'borrower',
    isVerifier: profile?.role === 'verifier',
    isLender: profile?.role === 'lender',
  };
}

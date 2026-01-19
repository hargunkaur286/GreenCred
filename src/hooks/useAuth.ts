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
          fetchProfile(session.user);
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
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureProfile = async (currentUser: User): Promise<Profile | null> => {
    const userId = currentUser.id;
    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return existing as Profile;

    // Backfill for users created before the DB trigger/migrations were applied.
    const roleFromMeta = (currentUser.user_metadata as any)?.role;
    const fullNameFromMeta = (currentUser.user_metadata as any)?.full_name ?? null;
    const organizationFromMeta = (currentUser.user_metadata as any)?.organization_name ?? null;

    const role: Profile['role'] = ['borrower', 'verifier', 'lender', 'admin'].includes(roleFromMeta)
      ? roleFromMeta
      : 'borrower';

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: currentUser.email ?? '',
        full_name: fullNameFromMeta,
        role,
        organization_name: organizationFromMeta,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;
    return inserted as Profile;
  };

  const fetchProfile = async (currentUser: User) => {
    try {
      const profileData = await ensureProfile(currentUser);
      setProfile(profileData);

      // If borrower, fetch their company
      if (profileData?.role === 'borrower') {
        const { data: borrowerData, error: borrowerError } = await supabase
          .from('borrowers')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (borrowerError) {
          console.error('Error fetching borrower:', borrowerError);
        }

        setBorrower(borrowerData as Borrower | null);
      } else {
        setBorrower(null);
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
      const { data: borrowerData, error } = await supabase
        .from('borrowers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error refetching borrower:', error);
      }
      
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

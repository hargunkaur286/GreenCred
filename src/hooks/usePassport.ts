import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function usePassport(borrowerId?: string) {
  const { borrower } = useAuth();
  const queryClient = useQueryClient();
  const targetBorrowerId = borrowerId || borrower?.id;

  // Fetch passport
  const { data: passport, isLoading: passportLoading } = useQuery({
    queryKey: ['passport', targetBorrowerId],
    queryFn: async () => {
      if (!targetBorrowerId) return null;

      const { data, error } = await supabase
        .from('esg_passports')
        .select('*')
        .eq('borrower_id', targetBorrowerId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!targetBorrowerId,
  });

  // Fetch borrower info for passport view
  const { data: borrowerInfo, isLoading: borrowerLoading } = useQuery({
    queryKey: ['borrower-info', targetBorrowerId],
    queryFn: async () => {
      if (!targetBorrowerId) return null;

      const { data, error } = await supabase
        .from('borrowers')
        .select('*')
        .eq('id', targetBorrowerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!targetBorrowerId,
  });

  // Fetch KPIs for the passport
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['passport-kpis', targetBorrowerId],
    queryFn: async () => {
      if (!targetBorrowerId) return [];

      const { data, error } = await supabase
        .from('kpi_submissions')
        .select('*')
        .eq('borrower_id', targetBorrowerId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!targetBorrowerId,
  });

  // Fetch verifications for the KPIs
  const { data: verifications, isLoading: verificationsLoading } = useQuery({
    queryKey: ['passport-verifications', kpis?.map(k => k.id)],
    queryFn: async () => {
      if (!kpis || kpis.length === 0) return [];

      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .in('kpi_id', kpis.map(k => k.id));

      if (error) throw error;
      return data || [];
    },
    enabled: !!kpis && kpis.length > 0,
  });

  // Fetch blockchain attestations
  const { data: attestations, isLoading: attestationsLoading } = useQuery({
    queryKey: ['passport-attestations', kpis?.map(k => k.id)],
    queryFn: async () => {
      if (!kpis || kpis.length === 0) return [];

      const { data, error } = await supabase
        .from('blockchain_attestations')
        .select('*')
        .in('kpi_id', kpis.map(k => k.id));

      if (error) throw error;
      return data || [];
    },
    enabled: !!kpis && kpis.length > 0,
  });

  // Generate passport
  const generatePassport = useMutation({
    mutationFn: async ({ isPublic }: { isPublic?: boolean } = {}) => {
      if (!targetBorrowerId) throw new Error('No borrower ID');

      const response = await supabase.functions.invoke('generate-passport', {
        body: { borrower_id: targetBorrowerId, is_public: !!isPublic },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passport', targetBorrowerId] });
      toast.success('ESG Passport generated successfully');
    },
    onError: (error) => {
      toast.error('Failed to generate passport: ' + error.message);
    },
  });

  return {
    passport,
    borrowerInfo,
    kpis: kpis || [],
    verifications: verifications || [],
    attestations: attestations || [],
    isLoading: passportLoading || borrowerLoading || kpisLoading || verificationsLoading || attestationsLoading,
    generatePassport,
  };
}

// Hook specifically for the public passport view
export function usePublicPassport(passportId: string) {
  const { data: passport, isLoading: passportLoading } = useQuery({
    queryKey: ['public-passport', passportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('esg_passports')
        .select('*')
        .eq('id', passportId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!passportId,
  });

  const { data: borrowerInfo } = useQuery({
    queryKey: ['public-borrower', passport?.borrower_id],
    queryFn: async () => {
      if (!passport?.borrower_id) return null;

      const { data, error } = await supabase
        .from('borrowers')
        .select('*')
        .eq('id', passport.borrower_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!passport?.borrower_id,
  });

  const { data: kpis } = useQuery({
    queryKey: ['public-kpis', passport?.borrower_id],
    queryFn: async () => {
      if (!passport?.borrower_id) return [];

      const { data, error } = await supabase
        .from('kpi_submissions')
        .select('*')
        .eq('borrower_id', passport.borrower_id)
        .eq('status', 'verified');

      if (error) throw error;
      return data || [];
    },
    enabled: !!passport?.borrower_id,
  });

  const { data: verifications } = useQuery({
    queryKey: ['public-verifications', kpis?.map(k => k.id)],
    queryFn: async () => {
      if (!kpis || kpis.length === 0) return [];

      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .in('kpi_id', kpis.map(k => k.id));

      if (error) throw error;
      return data || [];
    },
    enabled: !!kpis && kpis.length > 0,
  });

  const { data: attestations } = useQuery({
    queryKey: ['public-attestations', kpis?.map(k => k.id)],
    queryFn: async () => {
      if (!kpis || kpis.length === 0) return [];

      const { data, error } = await supabase
        .from('blockchain_attestations')
        .select('*')
        .in('kpi_id', kpis.map(k => k.id));

      if (error) throw error;
      return data || [];
    },
    enabled: !!kpis && kpis.length > 0,
  });

  return {
    passport,
    borrowerInfo,
    kpis: kpis || [],
    verifications: verifications || [],
    attestations: attestations || [],
    isLoading: passportLoading,
  };
}

import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Borrower {
  id: string;
  user_id: string | null;
  name: string;
  sector: string;
  country: string;
  size: 'small' | 'medium' | 'large';
  created_at: string;
}

interface ESGPassport {
  id: string;
  borrower_id: string;
  overall_score: number;
  environmental_score: number | null;
  social_score: number | null;
  governance_score: number | null;
  generated_at: string;
  valid_until: string;
  is_public: boolean;
}

interface BorrowerWithESG extends Borrower {
  esg_passport: ESGPassport | null;
  kpi_count: number;
  verified_kpi_count: number;
}

export function useBorrowers() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['borrowers'],
    queryFn: async () => {
      // Fetch borrowers with their passports
      const { data: borrowers, error: borrowersError } = await supabase
        .from('borrowers')
        .select(`
          *,
          esg_passports(*)
        `)
        .order('name');

      if (borrowersError) throw borrowersError;

      // Get KPI counts for each borrower
      const borrowersWithCounts = await Promise.all(
        (borrowers || []).map(async (borrower) => {
          const { count: totalCount } = await supabase
            .from('kpi_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('borrower_id', borrower.id);

          const { count: verifiedCount } = await supabase
            .from('kpi_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('borrower_id', borrower.id)
            .eq('status', 'verified');

          return {
            ...borrower,
            esg_passport: borrower.esg_passports?.[0] || null,
            kpi_count: totalCount || 0,
            verified_kpi_count: verifiedCount || 0,
          };
        })
      );

      return borrowersWithCounts;
    },
  });

  return {
    borrowers: (data || []) as BorrowerWithESG[],
    isLoading,
    error,
    refetch,
  };
}

export function useBorrower(borrowerId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['borrower', borrowerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('borrowers')
        .select(`
          *,
          esg_passports(*),
          kpi_submissions(
            *,
            verifications(*),
            blockchain_attestations(*),
            ml_validations(*)
          )
        `)
        .eq('id', borrowerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!borrowerId,
  });

  return {
    borrower: data,
    isLoading,
    error,
  };
}

export function useGeneratePassport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ borrowerId, isPublic = false }: { borrowerId: string; isPublic?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('generate-passport', {
        body: { borrower_id: borrowerId, is_public: isPublic },
      });

      if (error) throw error;
      return data.passport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['passport'] });
      toast.success('ESG Passport generated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to generate passport: ${error.message}`);
    },
  });
}

export function useSimulatePricing() {
  return useMutation({
    mutationFn: async ({
      borrowerId,
      baseRate,
      loanAmount,
    }: {
      borrowerId: string;
      baseRate: number;
      loanAmount?: number;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('simulate-pricing', {
        body: {
          borrower_id: borrowerId,
          base_rate: baseRate,
          loan_amount: loanAmount,
        },
      });

      if (error) throw error;
      return data.simulation;
    },
    onError: (error) => {
      toast.error(`Pricing simulation failed: ${error.message}`);
    },
  });
}

export function useCreateBorrower() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (borrowerData: {
      name: string;
      sector: string;
      country: string;
      size: 'small' | 'medium' | 'large';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('borrowers')
        .insert({
          user_id: user.id,
          ...borrowerData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] });
      toast.success('Company profile created!');
    },
    onError: (error) => {
      toast.error(`Failed to create company: ${error.message}`);
    },
  });
}

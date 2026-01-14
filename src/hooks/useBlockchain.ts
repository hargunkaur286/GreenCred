import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useBlockchain(borrowerId?: string) {
  const { borrower } = useAuth();
  const queryClient = useQueryClient();
  const targetBorrowerId = borrowerId || borrower?.id;

  // Fetch KPIs first to get their IDs
  const { data: kpis } = useQuery({
    queryKey: ['blockchain-kpis', targetBorrowerId],
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

  // Fetch blockchain attestations for the KPIs
  const { data: attestations, isLoading: attestationsLoading } = useQuery({
    queryKey: ['blockchain-attestations', kpis?.map(k => k.id)],
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

  // Fetch verifications to show verifier info
  const { data: verifications } = useQuery({
    queryKey: ['blockchain-verifications', kpis?.map(k => k.id)],
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

  // Create blockchain attestation
  const createAttestation = useMutation({
    mutationFn: async ({ kpiId, verificationId }: { kpiId: string; verificationId: string }) => {
      const response = await supabase.functions.invoke('blockchain-attest', {
        body: { kpi_id: kpiId, verification_id: verificationId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockchain-attestations'] });
      toast.success('Blockchain attestation created');
    },
    onError: (error) => {
      toast.error('Failed to create attestation: ' + error.message);
    },
  });

  // Combine attestations with KPI and verification data
  const attestationsWithDetails = attestations?.map(attestation => {
    const kpi = kpis?.find(k => k.id === attestation.kpi_id);
    const verification = verifications?.find(v => v.kpi_id === attestation.kpi_id);
    return {
      ...attestation,
      kpi,
      verification,
    };
  }) || [];

  return {
    attestations: attestationsWithDetails,
    kpis: kpis || [],
    verifications: verifications || [],
    isLoading: attestationsLoading,
    createAttestation,
  };
}

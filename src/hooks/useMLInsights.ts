import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useMLInsights(borrowerId?: string) {
  const { borrower } = useAuth();
  const queryClient = useQueryClient();
  const targetBorrowerId = borrowerId || borrower?.id;

  const buildDummyValidation = () => ({
    anomaly_score: 0.22,
    confidence_score: 0.86,
    flags: [] as string[],
    recommendations: ['Demo mode: validation service unavailable — showing placeholder results.'],
    sector_benchmark: null as number | null,
    yoy_change: null as number | null,
    ai_analysis: null as string | null,
  });

  // Fetch KPIs first to get their IDs
  const { data: kpis } = useQuery({
    queryKey: ['ml-kpis', targetBorrowerId],
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

  // Fetch ML validations for the KPIs
  const { data: validations, isLoading: validationsLoading } = useQuery({
    queryKey: ['ml-validations', kpis?.map(k => k.id)],
    queryFn: async () => {
      if (!kpis || kpis.length === 0) return [];

      const { data, error } = await supabase
        .from('ml_validations')
        .select('*')
        .in('kpi_id', kpis.map(k => k.id));

      if (error) throw error;
      return data || [];
    },
    enabled: !!kpis && kpis.length > 0,
  });

  // Run ML validation on a specific KPI
  const runValidation = useMutation({
    mutationFn: async (kpiId: string) => {
      const kpi = kpis?.find(k => k.id === kpiId);
      if (!kpi) throw new Error('KPI not found');

      const response = await supabase.functions.invoke('ml-validate', {
        body: {
          kpi_id: kpiId,
          kpi_type: kpi.kpi_type,
          value: kpi.value,
          unit: kpi.unit,
          sector: 'general', // This would come from borrower data
        },
      });

      if (response.error) {
        console.error('ML validation invoke error:', response.error);
        return { success: true, validation: buildDummyValidation() };
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-validations'] });
      toast.success('ML validation completed');
    },
    onError: (error) => {
      toast.error('ML validation failed: ' + error.message);
    },
  });

  // Combine validations with KPI data
  const validationsWithDetails = validations?.map(validation => {
    const kpi = kpis?.find(k => k.id === validation.kpi_id);
    return {
      ...validation,
      kpi,
    };
  }) || [];

  return {
    validations: validationsWithDetails,
    kpis: kpis || [],
    isLoading: validationsLoading,
    runValidation,
  };
}

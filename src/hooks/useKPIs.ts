import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

interface KPISubmission {
  id: string;
  borrower_id: string;
  kpi_type: string;
  category: 'environmental' | 'social' | 'governance';
  value: number;
  unit: string;
  period: string;
  baseline: number | null;
  target: number | null;
  notes: string | null;
  status: 'pending' | 'verified' | 'expired' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface MLValidation {
  id: string;
  kpi_id: string;
  anomaly_score: number;
  confidence_score: number;
  flags: string[];
  recommendations: string[];
  sector_benchmark: number | null;
  yoy_change: number | null;
  validated_at: string;
}

interface Verification {
  id: string;
  kpi_id: string;
  verifier_id: string;
  verifier_name: string;
  verifier_organization: string | null;
  method: 'audit' | 'third_party' | 'self_declared';
  confidence_score: number;
  signature: string;
  notes: string | null;
  verified_at: string;
  expires_at: string;
}

interface BlockchainAttestation {
  id: string;
  kpi_id: string;
  transaction_hash: string;
  block_number: number | null;
  network: string;
  data_hash: string;
  ipfs_hash: string | null;
  attested_at: string;
}

export function useKPIs(borrowerId?: string) {
  const queryClient = useQueryClient();
  const { borrower } = useAuth();
  
  const effectiveBorrowerId = borrowerId || borrower?.id;

  const { data: kpis, isLoading, error } = useQuery({
    queryKey: ['kpis', effectiveBorrowerId],
    queryFn: async () => {
      if (!effectiveBorrowerId) return [];
      
      const { data, error } = await supabase
        .from('kpi_submissions')
        .select(`
          *,
          ml_validations(*),
          verifications(*),
          blockchain_attestations(*),
          supporting_documents(*)
        `)
        .eq('borrower_id', effectiveBorrowerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveBorrowerId,
  });

  const submitKPI = useMutation({
    mutationFn: async (kpiData: {
      kpi_type: string;
      category: 'environmental' | 'social' | 'governance';
      value: number;
      unit: string;
      period: string;
      baseline?: number;
      target?: number;
      notes?: string;
      files?: File[];
    }) => {
      if (!effectiveBorrowerId) throw new Error('No borrower ID');

      // Insert KPI
      const { data: kpi, error: kpiError } = await supabase
        .from('kpi_submissions')
        .insert({
          borrower_id: effectiveBorrowerId,
          kpi_type: kpiData.kpi_type,
          category: kpiData.category,
          value: kpiData.value,
          unit: kpiData.unit,
          period: kpiData.period,
          baseline: kpiData.baseline,
          target: kpiData.target,
          notes: kpiData.notes,
          status: 'pending',
        })
        .select()
        .single();

      if (kpiError) throw kpiError;

      // Upload files if any
      if (kpiData.files && kpiData.files.length > 0) {
        for (const file of kpiData.files) {
          const filePath = `${effectiveBorrowerId}/${kpi.id}/${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

          if (!uploadError) {
            await supabase.from('supporting_documents').insert({
              kpi_id: kpi.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
            });
          }
        }
      }

      return kpi;
    },
    onSuccess: (kpi) => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      toast.success('KPI submitted successfully!');
      
      // Trigger ML validation
      runMLValidation(kpi.id);
    },
    onError: (error) => {
      toast.error(`Failed to submit KPI: ${error.message}`);
    },
  });

  const runMLValidation = async (kpiId: string, useAI = true) => {
    try {
      const { data, error } = await supabase.functions.invoke('ml-validate', {
        body: { kpi_id: kpiId, use_ai: useAI },
      });

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      return data.validation;
    } catch (error: any) {
      console.error('ML validation error:', error);
      toast.error(`ML validation failed: ${error.message}`);
      return null;
    }
  };

  const runMLValidationPreview = async (payload: {
    sector: string;
    kpi_type: string;
    value: number;
    has_documents: boolean;
    period?: string;
    yoy_change?: number | null;
    use_ai?: boolean;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('ml-validate', {
        body: {
          sector: payload.sector,
          kpi_type: payload.kpi_type,
          value: payload.value,
          has_documents: payload.has_documents,
          period: payload.period,
          yoy_change: payload.yoy_change,
          use_ai: payload.use_ai ?? false,
        },
      });

      if (error) throw error;
      return data.validation as {
        anomaly_score: number;
        confidence_score: number;
        flags: string[];
        recommendations: string[];
        sector_benchmark?: number | null;
        yoy_change?: number | null;
        ai_analysis?: string | null;
      };
    } catch (error: any) {
      console.error('ML validation preview error:', error);
      toast.error(`Validation failed: ${error.message}`);
      return null;
    }
  };

  return {
    kpis: kpis as (KPISubmission & {
      ml_validations: MLValidation[];
      verifications: Verification[];
      blockchain_attestations: BlockchainAttestation[];
      supporting_documents: { id: string; file_name: string; file_path: string }[];
    })[] || [],
    isLoading,
    error,
    submitKPI,
    runMLValidation,
    runMLValidationPreview,
  };
}

export function usePendingVerifications() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pending-verifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_submissions')
        .select(`
          *,
          borrower:borrowers(id, name, sector, country),
          ml_validations(*),
          supporting_documents(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  return {
    pendingKPIs: data || [],
    isLoading,
    error,
    refetch,
  };
}

export function useVerifyKPI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      kpiId,
      confidenceScore,
      method,
      notes,
      createBlockchainAttestation = true,
    }: {
      kpiId: string;
      confidenceScore: number;
      method: 'audit' | 'third_party' | 'self_declared';
      notes?: string;
      createBlockchainAttestation?: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('verify-kpi', {
        body: {
          kpi_id: kpiId,
          confidence_score: confidenceScore / 100, // Convert from percentage
          method,
          notes,
          create_blockchain_attestation: createBlockchainAttestation,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      toast.success('KPI verified successfully! Blockchain attestation created.');
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    },
  });
}

export function useRejectKPI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kpiId, reason }: { kpiId: string; reason?: string }) => {
      const { error } = await supabase
        .from('kpi_submissions')
        .update({ status: 'rejected', notes: reason })
        .eq('id', kpiId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-verifications'] });
      toast.info('KPI rejected. Borrower will be notified.');
    },
    onError: (error) => {
      toast.error(`Failed to reject KPI: ${error.message}`);
    },
  });
}

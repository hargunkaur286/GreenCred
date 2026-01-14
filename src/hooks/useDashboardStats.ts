import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export function useDashboardStats() {
  const { profile, borrower } = useAuth();

  // Borrower stats
  const { data: borrowerStats } = useQuery({
    queryKey: ['borrower-stats', borrower?.id],
    queryFn: async () => {
      if (!borrower?.id) return null;

      const { data: kpis } = await supabase
        .from('kpi_submissions')
        .select('id, status')
        .eq('borrower_id', borrower.id);

      const { data: passport } = await supabase
        .from('esg_passports')
        .select('overall_score')
        .eq('borrower_id', borrower.id)
        .maybeSingle();

      const total = kpis?.length || 0;
      const verified = kpis?.filter(k => k.status === 'verified').length || 0;
      const pending = kpis?.filter(k => k.status === 'pending').length || 0;

      return {
        totalKPIs: total,
        verifiedKPIs: verified,
        pendingKPIs: pending,
        overallScore: Math.round((Number(passport?.overall_score) || 0) * 100),
        scoreChange: 5, // TODO: Calculate actual change
      };
    },
    enabled: profile?.role === 'borrower' && !!borrower?.id,
  });

  // Verifier stats
  const { data: verifierStats } = useQuery({
    queryKey: ['verifier-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { count: pendingCount } = await supabase
        .from('kpi_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { data: myVerifications } = await supabase
        .from('verifications')
        .select('id, confidence_score, verified_at')
        .eq('verifier_id', profile.id);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      const completedThisMonth = myVerifications?.filter(
        v => new Date(v.verified_at) >= thisMonth
      ).length || 0;

      const avgConfidence = myVerifications?.length
        ? myVerifications.reduce((sum, v) => sum + v.confidence_score, 0) / myVerifications.length
        : 0;

      return {
        pendingReviews: pendingCount || 0,
        completedThisMonth,
        avgConfidenceScore: avgConfidence,
        totalVerifications: myVerifications?.length || 0,
      };
    },
    enabled: profile?.role === 'verifier',
  });

  // Lender stats
  const { data: lenderStats } = useQuery({
    queryKey: ['lender-stats'],
    queryFn: async () => {
      const { count: totalBorrowers } = await supabase
        .from('borrowers')
        .select('id', { count: 'exact', head: true });

      const { data: passports } = await supabase
        .from('esg_passports')
        .select('id, overall_score');

      const { count: pendingCount } = await supabase
        .from('kpi_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      const avgScore = passports?.length
        ? passports.reduce((sum, p) => sum + Number(p.overall_score), 0) / passports.length
        : 0;

      return {
        totalBorrowers: totalBorrowers || 0,
        verifiedBorrowers: passports?.length || 0,
        pendingReviews: pendingCount || 0,
        avgESGScore: avgScore,
        totalLoansValue: 450000000, // TODO: Add loan tracking
      };
    },
    enabled: profile?.role === 'lender',
  });

  return {
    borrowerStats: borrowerStats || {
      totalKPIs: 0,
      verifiedKPIs: 0,
      pendingKPIs: 0,
      overallScore: 0,
      scoreChange: 0,
    },
    verifierStats: verifierStats || {
      pendingReviews: 0,
      completedThisMonth: 0,
      avgConfidenceScore: 0,
      totalVerifications: 0,
    },
    lenderStats: lenderStats || {
      totalBorrowers: 0,
      verifiedBorrowers: 0,
      pendingReviews: 0,
      avgESGScore: 0,
      totalLoansValue: 0,
    },
  };
}

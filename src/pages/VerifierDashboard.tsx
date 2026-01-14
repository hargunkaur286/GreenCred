import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/shared/StatCard';
import { VerificationQueue } from '@/components/verifier/VerificationQueue';
import { BlockchainAuditTrail } from '@/components/blockchain/BlockchainAuditTrail';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAuth } from '@/hooks/useAuth';
import { Clock, CheckCircle2, BarChart3, Shield, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigate } from 'react-router-dom';

export default function VerifierDashboard() {
  const { isAuthenticated, loading, profile } = useAuth();
  const { verifierStats } = useDashboardStats();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (profile && profile.role !== 'verifier' && profile.role !== 'admin') {
    if (profile.role === 'borrower') return <Navigate to="/borrower" replace />;
    if (profile.role === 'lender') return <Navigate to="/lender" replace />;
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout title="Verifier Dashboard" subtitle="Review and verify ESG metrics with blockchain attestation">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Pending Reviews" value={verifierStats.pendingReviews} subtitle="Awaiting your review" icon={Clock} variant="primary" />
        <StatCard title="Completed This Month" value={verifierStats.completedThisMonth} subtitle="Verifications signed" icon={CheckCircle2} />
        <StatCard title="Avg. Confidence" value={`${(verifierStats.avgConfidenceScore * 100).toFixed(0)}%`} subtitle="Your verification scores" icon={BarChart3} />
        <StatCard title="Total Verifications" value={verifierStats.totalVerifications} subtitle="All-time signed" icon={Shield} variant="gold" />
      </div>

      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="queue">Verification Queue</TabsTrigger>
          <TabsTrigger value="history">Audit Trail</TabsTrigger>
        </TabsList>
        <TabsContent value="queue"><VerificationQueue /></TabsContent>
        <TabsContent value="history"><BlockchainAuditTrail /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/shared/StatCard';
import { BorrowerList } from '@/components/lender/BorrowerList';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAuth } from '@/hooks/useAuth';
import { Building2, CheckCircle2, Clock, DollarSign, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function LenderDashboard() {
  const { isAuthenticated, loading, profile } = useAuth();
  const { lenderStats } = useDashboardStats();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (profile && profile.role !== 'lender' && profile.role !== 'admin') {
    if (profile.role === 'borrower') return <Navigate to="/borrower" replace />;
    if (profile.role === 'verifier') return <Navigate to="/verifier" replace />;
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout title="Lender Portal" subtitle="Access verified ESG profiles for sustainability-linked loan structuring">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Borrowers" value={lenderStats.totalBorrowers} subtitle="In the system" icon={Building2} />
        <StatCard title="With Passports" value={lenderStats.verifiedBorrowers} subtitle="ESG passports generated" icon={CheckCircle2} variant="primary" />
        <StatCard title="Pending Reviews" value={lenderStats.pendingReviews} subtitle="Awaiting verification" icon={Clock} />
        <StatCard title="Total Loan Value" value={`$${(lenderStats.totalLoansValue / 1000000).toFixed(0)}M`} subtitle="Sustainability-linked" icon={DollarSign} variant="gold" />
      </div>
      <BorrowerList />
    </DashboardLayout>
  );
}

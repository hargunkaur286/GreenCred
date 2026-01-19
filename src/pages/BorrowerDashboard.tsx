import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/shared/StatCard';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { KPISubmissionForm } from '@/components/borrower/KPISubmissionForm';
import { KPIList } from '@/components/borrower/KPIList';
import { CompanyProfileForm } from '@/components/borrower/CompanyProfileForm';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAuth } from '@/hooks/useAuth';
import { FileCheck, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigate } from 'react-router-dom';

export default function BorrowerDashboard() {
  const { isAuthenticated, loading, borrower, profile, refetchBorrower, user } = useAuth();
  const { borrowerStats } = useDashboardStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (profile && profile.role !== 'borrower' && profile.role !== 'admin') {
    if (profile.role === 'verifier') return <Navigate to="/verifier" replace />;
    if (profile.role === 'lender') return <Navigate to="/lender" replace />;
    return <Navigate to="/" replace />;
  }

  // Show company profile form if user doesn't have a company yet
  if (!borrower) {
    return (
      <DashboardLayout
        title="Welcome to GreenCred"
        subtitle="Create your company profile to get started"
      >
        {user?.id ? (
          <CompanyProfileForm userId={user.id} onSuccess={() => refetchBorrower()} />
        ) : (
          <div className="min-h-[200px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Borrower Dashboard"
      subtitle="Manage your ESG metrics and create verified passports for lenders"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total KPIs" value={borrowerStats.totalKPIs} subtitle="Across all categories" icon={FileCheck} />
        <StatCard title="Verified" value={borrowerStats.verifiedKPIs} subtitle="Ready for lenders" icon={TrendingUp} variant="primary" />
        <StatCard title="Pending" value={borrowerStats.pendingKPIs} subtitle="Awaiting verification" icon={Clock} />
        <StatCard title="ESG Score" value={borrowerStats.overallScore} subtitle="Overall rating" icon={TrendingUp} variant="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl p-6 text-center">
            <h3 className="font-heading font-semibold mb-4">Your ESG Score</h3>
            <ProgressRing progress={borrowerStats.overallScore} size="lg" className="mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              Based on {borrowerStats.verifiedKPIs} verified KPIs
            </p>
          </div>
        </div>
        <div className="lg:col-span-2">
          <Tabs defaultValue="submit" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="submit">Submit New KPI</TabsTrigger>
              <TabsTrigger value="existing">My KPIs</TabsTrigger>
            </TabsList>
            <TabsContent value="submit" className="mt-4"><KPISubmissionForm /></TabsContent>
            <TabsContent value="existing" className="mt-4"><KPIList /></TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}

import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ESGPassportView } from '@/components/passport/ESGPassportView';
import { useAuth } from '@/hooks/useAuth';

export default function MyPassport() {
  const { isAuthenticated, loading, borrower, profile } = useAuth();

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

  if (!borrower) {
    return <Navigate to="/borrower" replace />;
  }

  return (
    <DashboardLayout
      title="My ESG Passport"
      subtitle="Generate and share a verified ESG passport"
    >
      <ESGPassportView />
    </DashboardLayout>
  );
}

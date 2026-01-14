import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ESGPassportView } from '@/components/passport/ESGPassportView';
import { MLInsights } from '@/components/ml/MLInsights';
import { BlockchainAuditTrail } from '@/components/blockchain/BlockchainAuditTrail';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePublicPassport } from '@/hooks/usePassport';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function PassportView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isResolvingDemo, setIsResolvingDemo] = useState(false);

  useEffect(() => {
    const resolveDemo = async () => {
      if (id !== 'demo') return;
      setIsResolvingDemo(true);
      try {
        const { data, error } = await supabase
          .from('esg_passports')
          .select('id')
          .eq('is_public', true)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data?.id) {
          navigate(`/passport/${data.id}`, { replace: true });
        }
      } finally {
        setIsResolvingDemo(false);
      }
    };

    resolveDemo();
  }, [id, navigate]);

  const { passport, borrowerInfo, isLoading } = usePublicPassport(id && id !== 'demo' ? id : '');

  if (isResolvingDemo || isLoading) {
    return (
      <DashboardLayout
        title="ESG Passport"
        subtitle="Loading passport data..."
      >
        <Card className="glass-card">
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!passport) {
    return (
      <DashboardLayout
        title="ESG Passport"
        subtitle={id === 'demo' ? 'No demo passport available' : 'Passport not found'}
      >
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-xl font-semibold mb-2">
              {id === 'demo' ? 'No Public Passport Found' : 'Passport Not Found'}
            </h3>
            <p className="text-muted-foreground">
              {id === 'demo'
                ? 'Ask a borrower or admin to generate a public passport (is_public=true).'
                : "This passport either doesn't exist or is not publicly accessible."}
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="ESG Passport"
      subtitle={`Verified ESG data profile for ${borrowerInfo?.name || 'Company'}`}
    >
      <Tabs defaultValue="passport" className="space-y-6">
        <TabsList>
          <TabsTrigger value="passport">ESG Passport</TabsTrigger>
          <TabsTrigger value="ml">AI Insights</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain Trail</TabsTrigger>
        </TabsList>
        
        <TabsContent value="passport">
          <ESGPassportView borrowerId={passport.borrower_id} />
        </TabsContent>
        
        <TabsContent value="ml">
          <MLInsights borrowerId={passport.borrower_id} />
        </TabsContent>
        
        <TabsContent value="blockchain">
          <BlockchainAuditTrail borrowerId={passport.borrower_id} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

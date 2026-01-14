import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { KPI_DEFINITIONS, VerificationStatus } from '@/types/esg';
import { FileText, ExternalLink, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useKPIs } from '@/hooks/useKPIs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function KPIList() {
  const { kpis, isLoading } = useKPIs();

  const openDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Failed to create signed URL');

      const opened = window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        // Fallback if popups are blocked
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = fileName;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to open document');
    }
  };

  const getExplorerTxUrl = (network: string | null | undefined, txHash: string) => {
    const n = (network || '').toLowerCase();
    if (n.includes('amoy')) return `https://amoy.polygonscan.com/tx/${txHash}`;
    return `https://polygonscan.com/tx/${txHash}`;
  };

  const getKPIMetadata = (kpiType: string) => {
    return KPI_DEFINITIONS.find(k => k.id === kpiType);
  };

  const calculateProgress = (value: number, baseline?: number | null, target?: number | null) => {
    if (!baseline || !target) return null;
    const totalChange = Math.abs(target - baseline);
    const currentChange = Math.abs(value - baseline);
    const progress = (currentChange / totalChange) * 100;
    const isOnTrack = target < baseline 
      ? value <= baseline
      : value >= baseline;
    return { progress: Math.min(progress, 100), isOnTrack };
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (kpis.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Your ESG KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No KPIs submitted yet. Use the form to add your first ESG metric.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Your ESG KPIs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {kpis.map((kpi) => {
            const metadata = getKPIMetadata(kpi.kpi_type);
            const status = kpi.status as VerificationStatus;
            const progress = calculateProgress(kpi.value, kpi.baseline, kpi.target);
            const verification = kpi.verifications?.[0];
            const blockchain = kpi.blockchain_attestations?.[0];

            return (
              <div
                key={kpi.id}
                className="border rounded-xl p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{metadata?.name || kpi.kpi_type}</h4>
                    <p className="text-sm text-muted-foreground">Period: {kpi.period}</p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current</p>
                    <p className="text-lg font-semibold">
                      {kpi.value.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{kpi.unit}</span>
                    </p>
                  </div>
                  {kpi.baseline && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Baseline</p>
                      <p className="text-lg font-semibold text-muted-foreground">
                        {kpi.baseline.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {kpi.target && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Target</p>
                      <p className="text-lg font-semibold text-primary">
                        {kpi.target.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {progress && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1">
                        {progress.isOnTrack ? (
                          <TrendingUp className="h-4 w-4 text-verified" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        Progress to Target
                      </span>
                      <span className="font-medium">{progress.progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${progress.isOnTrack ? 'bg-verified' : 'bg-pending'}`}
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {verification && status === 'verified' && (
                  <div className="bg-verified/5 rounded-lg p-3 mb-3">
                    <p className="text-sm">
                      <span className="font-medium">Verified by:</span> {verification.verifier_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Confidence: {(verification.confidence_score * 100).toFixed(0)}% • 
                      Expires: {new Date(verification.expires_at).toLocaleDateString()}
                    </p>
                    {blockchain && (
                      <a
                        href={getExplorerTxUrl(blockchain.network, blockchain.transaction_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                      >
                        View on Blockchain <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {kpi.supporting_documents && kpi.supporting_documents.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {kpi.supporting_documents.map((doc) => (
                      <Button
                        key={doc.id}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => openDocument(doc.file_path, doc.file_name)}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {doc.file_name}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

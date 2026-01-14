import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlockchain } from '@/hooks/useBlockchain';
import { KPI_DEFINITIONS } from '@/types/esg';
import { Link as LinkIcon, ExternalLink, Shield, Clock, CheckCircle2 } from 'lucide-react';

interface BlockchainAuditTrailProps {
  borrowerId?: string;
}

export function BlockchainAuditTrail({ borrowerId }: BlockchainAuditTrailProps) {
  const { attestations, isLoading } = useBlockchain(borrowerId);

  const getExplorerTxUrl = (network: string | null | undefined, txHash: string) => {
    const n = (network || '').toLowerCase();
    if (n.includes('amoy')) return `https://amoy.polygonscan.com/tx/${txHash}`;
    return `https://polygonscan.com/tx/${txHash}`;
  };

  const getNetworkLabel = (network: string | null | undefined) => {
    const n = (network || '').toLowerCase();
    if (n.includes('amoy')) return 'Polygon Amoy';
    if (n.includes('polygon')) return 'Polygon';
    return 'Unknown';
  };

  const getIpfsUrl = (network: string | null | undefined, cid: string) => {
    const n = (network || '').toLowerCase();
    if (n.includes('amoy')) return `https://gateway.pinata.cloud/ipfs/${cid}`;
    return `https://ipfs.io/ipfs/${cid}`;
  };

  const attestationsWithDetails = attestations.map(attestation => {
    const metadata = KPI_DEFINITIONS.find(k => k.id === attestation.kpi?.kpi_type);
    return {
      ...attestation,
      metadata,
    };
  });

  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Blockchain Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (attestationsWithDetails.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Blockchain Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No blockchain attestations yet.</p>
            <p className="text-sm mt-2">Attestations are created when KPIs are verified.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" />
          Blockchain Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {attestationsWithDetails.map((item) => (
            <div
              key={item.id}
              className="border rounded-xl p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium">{item.metadata?.name || item.kpi?.kpi_type || 'Unknown KPI'}</h4>
                  <p className="text-sm text-muted-foreground">
                    {item.kpi ? `${Number(item.kpi.value).toLocaleString()} ${item.kpi.unit} • Period: ${item.kpi.period}` : 'No KPI data'}
                  </p>
                </div>
                <Badge variant="outline" className="bg-primary/5">
                  {getNetworkLabel(item.network)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Recorded
                  </p>
                  <p className="font-medium">
                    {new Date(item.attested_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Block Number</p>
                  <p className="font-mono">{item.block_number?.toLocaleString() || 'Pending'}</p>
                </div>
              </div>

              {item.verification && (
                <div className="bg-verified/5 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-verified" />
                    <span className="font-medium">{item.verification.verifier_name}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      Confidence: {(Number(item.verification.confidence_score) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <a
                  href={getExplorerTxUrl(item.network, item.transaction_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-lg text-sm hover:bg-muted/80 transition-colors"
                >
                  <span className="text-muted-foreground">TX:</span>
                  <span className="font-mono">{formatTxHash(item.transaction_hash)}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                {item.ipfs_hash && (
                  <a
                    href={getIpfsUrl(item.network, item.ipfs_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-lg text-sm hover:bg-muted/80 transition-colors"
                  >
                    <span className="text-muted-foreground">IPFS:</span>
                    <span className="font-mono">{item.ipfs_hash.slice(0, 12)}...</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-verified">
                <CheckCircle2 className="h-3 w-3" />
                <span>Immutably recorded on-chain</span>
              </div>
            </div>
          ))}
        </div>

        {/* Verification Notice */}
        <div className="mt-6 p-4 bg-primary/5 rounded-lg">
          <h4 className="font-medium mb-2">What is Blockchain Attestation?</h4>
          <p className="text-sm text-muted-foreground">
            Each verified KPI is hashed and recorded on the Polygon blockchain, creating an immutable 
            proof of verification. The full data is stored on IPFS for retrieval, while only the hash 
            is recorded on-chain for efficiency. This allows any party to independently verify that 
            the ESG data has not been tampered with since verification.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { KPI_DEFINITIONS, VerificationStatus } from '@/types/esg';
import { usePassport, usePassportById } from '@/hooks/usePassport';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Download, Share2, QrCode, Leaf, Users, Building2, 
  CheckCircle2, ExternalLink, Copy, Shield, Link as LinkIcon,
  RefreshCw
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

const categoryConfig = {
  environmental: { icon: Leaf, label: 'Environmental', color: 'text-emerald' },
  social: { icon: Users, label: 'Social', color: 'text-blue-500' },
  governance: { icon: Building2, label: 'Governance', color: 'text-purple-500' },
};

interface ESGPassportViewProps {
  borrowerId?: string;
  passportId?: string;
}

export function ESGPassportView({ borrowerId, passportId }: ESGPassportViewProps) {
  const borrowerResult = usePassport(borrowerId);
  const byIdResult = usePassportById(passportId || '');

  const passport = passportId ? byIdResult.passport : borrowerResult.passport;
  const borrowerInfo = passportId ? byIdResult.borrowerInfo : borrowerResult.borrowerInfo;
  const kpis = passportId ? byIdResult.kpis : borrowerResult.kpis;
  const verifications = passportId ? byIdResult.verifications : borrowerResult.verifications;
  const attestations = passportId ? byIdResult.attestations : borrowerResult.attestations;
  const isLoading = passportId ? byIdResult.isLoading : borrowerResult.isLoading;
  const generatePassport = passportId ? null : borrowerResult.generatePassport;

  const isReadOnly = useMemo(() => !!borrowerId || !!passportId, [borrowerId, passportId]);
  const [isPublic, setIsPublic] = useState<boolean>(false);

  useEffect(() => {
    setIsPublic(Boolean(passport?.is_public));
  }, [passport?.is_public]);

  const passportUrl = passport ? `${window.location.origin}/passport/${passport.id}` : '';
  const passportScorePercent = passport ? Math.round((Number(passport.overall_score) || 0) * 100) : 0;

  const getVerificationStatus = (kpiId: string): VerificationStatus => {
    const verification = verifications.find(v => v.kpi_id === kpiId);
    if (!verification) return 'pending';
    const expiryDate = new Date(verification.expires_at);
    if (expiryDate < new Date()) return 'expired';
    return 'verified';
  };

  const getBlockchainAttestation = (kpiId: string) => {
    return attestations.find(b => b.kpi_id === kpiId);
  };

  const getExplorerTxUrl = (network: string | null | undefined, txHash: string) => {
    const n = (network || '').toLowerCase();
    if (n.includes('amoy')) return `https://amoy.polygonscan.com/tx/${txHash}`;
    return `https://polygonscan.com/tx/${txHash}`;
  };

  const getVerification = (kpiId: string) => {
    return verifications.find(v => v.kpi_id === kpiId);
  };

  const handleCopyLink = () => {
    if (passport) {
      navigator.clipboard.writeText(passportUrl);
      toast.success('Passport link copied to clipboard');
    }
  };

  const handleExport = () => {
    if (!passport) return;

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const left = 40;
      let y = 48;

      doc.setFontSize(18);
      doc.text('GreenCred ESG Passport', left, y);
      y += 20;

      doc.setFontSize(11);
      doc.text(`Company: ${borrowerInfo?.name || 'N/A'}`, left, y);
      y += 14;
      doc.text(`Sector: ${borrowerInfo?.sector || 'N/A'}    Country: ${borrowerInfo?.country || 'N/A'}`, left, y);
      y += 14;
      doc.text(`Passport ID: ${passport.id}`, left, y);
      y += 14;
      doc.text(`Overall Score: ${passportScorePercent}%`, left, y);
      y += 14;
      doc.text(`Generated: ${new Date(passport.generated_at).toLocaleDateString()}    Valid Until: ${new Date(passport.valid_until).toLocaleDateString()}`, left, y);
      y += 18;
      doc.text(`Link: ${passportUrl}`, left, y);
      y += 22;

      const verifiedKpis = (kpis || []).filter((k: any) => k.status === 'verified');
      doc.setFontSize(13);
      doc.text('Verified KPIs', left, y);
      y += 16;
      doc.setFontSize(10);

      if (verifiedKpis.length === 0) {
        doc.text('No verified KPIs yet.', left, y);
      } else {
        for (const kpi of verifiedKpis) {
          const meta = KPI_DEFINITIONS.find(d => d.id === kpi.kpi_type);
          const line = `${meta?.name || kpi.kpi_type} (${kpi.period}): ${Number(kpi.value).toLocaleString()} ${kpi.unit}`;
          const lines = doc.splitTextToSize(line, 520);

          for (const l of lines) {
            if (y > 770) {
              doc.addPage();
              y = 48;
            }
            doc.text(l, left, y);
            y += 12;
          }
        }
      }

      doc.save(`GreenCred-ESG-Passport-${(borrowerInfo?.name || 'Company').replace(/\s+/g, '-')}.pdf`);
      toast.success('PDF downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate PDF');
    }
  };

  const handleShare = async () => {
    if (!passport) return;
    try {
      const shareData = {
        title: 'GreenCred ESG Passport',
        text: `ESG Passport for ${borrowerInfo?.name || 'Company'}`,
        url: passportUrl,
      };

      // @ts-expect-error - Web Share API
      if (navigator.share) {
        // @ts-expect-error - Web Share API
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(passportUrl);
        toast.success('Link copied (sharing not supported)');
      }
    } catch {
      // user cancelled share
    }
  };

  const handleQrCode = async () => {
    if (!passport) return;
    try {
      const dataUrl = await QRCode.toDataURL(passportUrl, { width: 768, margin: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `GreenCred-Passport-QR-${passport.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('QR code downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate QR code');
    }
  };

  const handleGeneratePassport = () => {
    if (!generatePassport) return;
    generatePassport.mutate({ isPublic });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!passport) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
            <Leaf className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-heading text-xl font-semibold mb-2">No Passport Generated</h3>
          <p className="text-muted-foreground mb-6">
            {kpis.length === 0 
              ? 'Submit some KPIs first, then generate your ESG Passport.' 
              : 'Generate your ESG Passport to share verified ESG data with lenders.'}
          </p>
          {!isReadOnly && kpis.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Label htmlFor="passport-public" className="text-sm">Make passport public</Label>
                <Switch
                  id="passport-public"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked)}
                />
              </div>
              <Button onClick={handleGeneratePassport} disabled={generatePassport?.isPending}>
                <RefreshCw className={`h-4 w-4 mr-2 ${generatePassport?.isPending ? 'animate-spin' : ''}`} />
                {generatePassport?.isPending ? 'Generating...' : 'Generate Passport'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Group KPIs by category
  const kpisByCategory = kpis.reduce((acc, kpi) => {
    const metadata = KPI_DEFINITIONS.find(d => d.id === kpi.kpi_type);
    if (metadata) {
      if (!acc[kpi.category]) acc[kpi.category] = [];
      acc[kpi.category].push({ ...kpi, metadata });
    }
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="glass-card overflow-hidden">
        <div className="bg-primary/5 p-6 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Leaf className="h-8 w-8" />
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold">{borrowerInfo?.name || 'Company'}</h2>
                <p className="text-muted-foreground">
                  {borrowerInfo?.sector || 'N/A'} • {borrowerInfo?.country || 'N/A'}
                </p>
              </div>
            </div>
            <ProgressRing progress={passportScorePercent} size="md" />
          </div>
        </div>

        <CardContent className="p-6">
          {!isReadOnly && (
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-sm font-medium">Public passport</p>
                <p className="text-sm text-muted-foreground">Allow anyone with the link to view.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Private</span>
                <Switch
                  id="passport-public"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked)}
                />
                <span className="text-sm text-muted-foreground">Public</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Passport ID</p>
              <p className="font-mono text-sm">{passport.id.slice(0, 8)}...</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Generated</p>
              <p className="font-medium">{new Date(passport.generated_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valid Until</p>
              <p className="font-medium">{new Date(passport.valid_until).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Verified KPIs</p>
              <p className="font-medium">{kpis.filter(k => k.status === 'verified').length} / {kpis.length}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="default" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share with Lender
            </Button>
            <Button variant="outline" onClick={handleQrCode}>
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
            {!isReadOnly && (
              <Button variant="outline" onClick={handleGeneratePassport} disabled={!!generatePassport?.isPending}>
                <RefreshCw className={`h-4 w-4 mr-2 ${generatePassport?.isPending ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs by Category */}
      {Object.entries(kpisByCategory).map(([category, categoryKpis]) => {
        const config = categoryConfig[category as keyof typeof categoryConfig];
        if (!config) return null;
        const Icon = config.icon;

        return (
          <Card key={category} className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${config.color}`} />
                {config.label} Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {categoryKpis.map((kpi) => {
                  const status = getVerificationStatus(kpi.id);
                  const blockchain = getBlockchainAttestation(kpi.id);
                  const verification = getVerification(kpi.id);

                  return (
                    <div key={kpi.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{kpi.metadata.name}</h4>
                          <p className="text-sm text-muted-foreground">{kpi.metadata.description}</p>
                        </div>
                        <StatusBadge status={status} />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Value</p>
                          <p className="font-semibold">{Number(kpi.value).toLocaleString()} {kpi.unit}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Period</p>
                          <p className="font-medium">{kpi.period}</p>
                        </div>
                        {kpi.target && (
                          <div>
                            <p className="text-xs text-muted-foreground">Target</p>
                            <p className="font-medium">{Number(kpi.target).toLocaleString()}</p>
                          </div>
                        )}
                        {verification && (
                          <div>
                            <p className="text-xs text-muted-foreground">Confidence</p>
                            <p className="font-medium">{(Number(verification.confidence_score) * 100).toFixed(0)}%</p>
                          </div>
                        )}
                      </div>

                      {(verification || blockchain) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {verification && (
                            <div className="inline-flex items-center gap-1.5 bg-verified/10 text-verified px-2 py-1 rounded-md text-xs">
                              <Shield className="h-3 w-3" />
                              <span>{verification.verifier_name}</span>
                            </div>
                          )}
                          {blockchain && (
                            <a 
                              href={getExplorerTxUrl(blockchain.network, blockchain.transaction_hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs hover:bg-primary/20 transition-colors"
                            >
                              <LinkIcon className="h-3 w-3" />
                              <span className="font-mono">{blockchain.transaction_hash.slice(0, 10)}...</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* No KPIs message */}
      {Object.keys(kpisByCategory).length === 0 && (
        <Card className="glass-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            No KPIs have been submitted yet.
          </CardContent>
        </Card>
      )}

      {/* LMA Compliance Badge */}
      <Card className="glass-card bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">LMA SLL Principles Compliant</h3>
              <p className="text-sm text-muted-foreground">
                This ESG Passport follows the Loan Market Association's Sustainability-Linked Loan Principles (2025) 
                and ESG Information Data Portal standards.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { KPI_DEFINITIONS } from '@/types/esg';
import { CheckCircle, XCircle, FileText, Brain, Link as LinkIcon, Shield, Loader2 } from 'lucide-react';
import { usePendingVerifications, useVerifyKPI, useRejectKPI } from '@/hooks/useKPIs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function VerificationQueue() {
  const { pendingKPIs, isLoading, refetch } = usePendingVerifications();
  const verifyMutation = useVerifyKPI();
  const rejectMutation = useRejectKPI();
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [confidenceScore, setConfidenceScore] = useState([85]);
  const [method, setMethod] = useState<string>('audit');
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);

  const openDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Failed to create signed URL');

      const opened = window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
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

  const runOcrValidation = async (documentId: string, kpiId: string, expectedValue: number, expectedUnit: string) => {
    try {
      setIsOcrRunning(true);
      const { data, error } = await supabase.functions.invoke('ocr-document', {
        body: {
          document_id: documentId,
          kpi_id: kpiId,
          expected_value: expectedValue,
          expected_unit: expectedUnit,
        },
      });

      if (error) throw error;

      const result = data?.ocr_result;
      if (!result) {
        toast.error('OCR did not return a result');
        return;
      }

      const confidencePct = Math.round((Number(result.match_confidence) || 0) * 100);
      if (result.is_match) {
        toast.success(`OCR match confirmed (${confidencePct}% confidence)`);
      } else {
        toast.warning(`OCR mismatch (${confidencePct}% confidence) – review recommended`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'OCR validation failed');
    } finally {
      setIsOcrRunning(false);
    }
  };

  const getKPIName = (kpiType: string) => {
    return KPI_DEFINITIONS.find(k => k.id === kpiType)?.name || kpiType;
  };

  const handleVerify = async () => {
    if (!selectedItem) return;

    try {
      await verifyMutation.mutateAsync({
        kpiId: selectedItem.id,
        confidenceScore: confidenceScore[0],
        method: method as 'audit' | 'third_party' | 'self_declared',
        notes: notes || undefined,
        createBlockchainAttestation: true,
      });
      
      setDialogOpen(false);
      setSelectedItem(null);
      setNotes('');
      setConfidenceScore([85]);
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    
    try {
      await rejectMutation.mutateAsync({
        kpiId: selectedItem.id,
        reason: notes || undefined,
      });
      
      setDialogOpen(false);
      setSelectedItem(null);
      setNotes('');
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
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

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Pending Verifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingKPIs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-verified" />
              <p>All caught up! No pending verifications.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingKPIs.map((item: any) => {
                const mlValidation = item.ml_validations?.[0];
                
                return (
                  <div
                    key={item.id}
                    className="border rounded-xl p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{getKPIName(item.kpi_type)}</h4>
                        <p className="text-sm text-muted-foreground">{item.borrower?.name || 'Unknown Borrower'}</p>
                      </div>
                      <Badge variant="outline">{item.period}</Badge>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-2xl font-bold">
                          {item.value.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
                        </p>
                      </div>
                      
                      {mlValidation && (
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-accent" />
                          <span className="text-sm">
                            ML Confidence: {(mlValidation.confidence_score * 100).toFixed(0)}%
                          </span>
                          {mlValidation.flags && mlValidation.flags.length > 0 && (
                            <Badge variant="secondary" className="bg-pending/20 text-pending">
                              Review Needed
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {item.supporting_documents && item.supporting_documents.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        {item.supporting_documents.map((doc: any) => (
                          <Button
                            key={doc.id}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => openDocument(doc.file_path, doc.file_name)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            {doc.file_name}
                          </Button>
                        ))}
                      </div>
                    )}

                    <Dialog open={dialogOpen && selectedItem?.id === item.id} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (!open) {
                        setSelectedItem(null);
                        setIsOcrRunning(false);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="default" 
                          className="w-full"
                          onClick={() => {
                            setSelectedItem(item);
                            setDialogOpen(true);
                          }}
                        >
                          Review & Verify
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
                        <DialogHeader>
                          <DialogTitle>Verify KPI</DialogTitle>
                          <DialogDescription>
                            Review the submitted data and provide your verification assessment
                          </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
                          {/* KPI Summary */}
                          <div className="bg-muted/50 rounded-lg p-4">
                            <h4 className="font-medium mb-2">{getKPIName(item.kpi_type)}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{item.borrower?.name}</p>
                            <p className="text-2xl font-bold">
                              {item.value.toLocaleString()} {item.unit}
                            </p>
                          </div>

                          {/* Verification Method */}
                          <div className="space-y-2">
                            <Label>Verification Method</Label>
                            <Select value={method} onValueChange={setMethod}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="audit">Audit (Highest Assurance)</SelectItem>
                                <SelectItem value="third_party">Third-Party Review</SelectItem>
                                <SelectItem value="self_declared">Self-Declared (Lowest)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Confidence Score */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Confidence Score</Label>
                              <span className="font-mono font-semibold">{confidenceScore[0]}%</span>
                            </div>
                            <Slider
                              value={confidenceScore}
                              onValueChange={setConfidenceScore}
                              min={50}
                              max={100}
                              step={1}
                            />
                            <p className="text-xs text-muted-foreground">
                              How confident are you in the accuracy of this data?
                            </p>
                          </div>

                          {/* Notes */}
                          <div className="space-y-2">
                            <Label>Verification Notes</Label>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Add any notes about your verification process..."
                              rows={3}
                            />
                          </div>

                          {/* Optional OCR Validation */}
                          {item.supporting_documents && item.supporting_documents.length > 0 && (
                            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                              <p className="text-sm font-medium">Document OCR validation</p>
                              <p className="text-xs text-muted-foreground">
                                PDF-only for now: extracts embedded PDF text to cross-check the KPI value.
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isOcrRunning}
                                onClick={() => {
                                  const doc = item.supporting_documents?.[0];
                                  if (!doc?.id) {
                                    toast.error('No document available for OCR');
                                    return;
                                  }

                                  const isPdf = String(doc.file_type || '').toLowerCase().includes('pdf') ||
                                    String(doc.file_name || '').toLowerCase().endsWith('.pdf');
                                  if (!isPdf) {
                                    toast.error('OCR supports PDF documents only right now');
                                    return;
                                  }

                                  runOcrValidation(doc.id, item.id, Number(item.value), String(item.unit));
                                }}
                              >
                                {isOcrRunning ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Brain className="h-4 w-4 mr-2" />
                                )}
                                {isOcrRunning ? 'Running OCR...' : 'Run OCR on first document'}
                              </Button>
                            </div>
                          )}

                          {/* Blockchain Notice */}
                          <div className="bg-primary/5 rounded-lg p-3 flex items-start gap-3">
                            <LinkIcon className="h-5 w-5 text-primary mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium">Blockchain Attestation</p>
                              <p className="text-muted-foreground">
                                Your verification will be recorded on Polygon for immutable proof
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={handleReject}
                              disabled={rejectMutation.isPending}
                            >
                              {rejectMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              Reject
                            </Button>
                            <Button
                              variant="default"
                              className="flex-1"
                              onClick={handleVerify}
                              disabled={verifyMutation.isPending}
                            >
                              {verifyMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Verify & Sign
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

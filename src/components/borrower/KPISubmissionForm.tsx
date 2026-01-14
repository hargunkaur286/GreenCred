import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { KPI_DEFINITIONS, KPIType, KPICategory } from '@/types/esg';
import { Upload, Leaf, Users, Building2, Send, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useKPIs } from '@/hooks/useKPIs';
import { useAuth } from '@/hooks/useAuth';

const categoryIcons = {
  environmental: Leaf,
  social: Users,
  governance: Building2,
};

interface MLValidationResult {
  anomaly_score: number;
  confidence_score: number;
  flags: string[];
  recommendations: string[];
}

export function KPISubmissionForm() {
  const { borrower } = useAuth();
  const { submitKPI, runMLValidationPreview } = useKPIs();
  
  const [selectedKPI, setSelectedKPI] = useState<KPIType | ''>('');
  const [value, setValue] = useState('');
  const [period, setPeriod] = useState('2024');
  const [baseline, setBaseline] = useState('');
  const [target, setTarget] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mlValidation, setMlValidation] = useState<MLValidationResult | null>(null);

  const selectedKPIData = KPI_DEFINITIONS.find(k => k.id === selectedKPI);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleRunMLValidation = async () => {
    if (!selectedKPI || !value) {
      toast.error('Please select a KPI and enter a value first');
      return;
    }

    if (!borrower) {
      toast.error('Please create a company profile first');
      return;
    }

    setIsValidating(true);
    
    try {
      const result = await runMLValidationPreview({
        sector: borrower.sector,
        kpi_type: selectedKPI,
        value: parseFloat(value),
        has_documents: files.length > 0,
        period,
      });

      if (!result) throw new Error('No validation result');

      setMlValidation({
        anomaly_score: Number(result.anomaly_score) || 0,
        confidence_score: Number(result.confidence_score) || 0,
        flags: Array.isArray(result.flags) ? result.flags : [],
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
      });
      toast.success('Validation complete');
    } catch (error) {
      toast.error('Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedKPI || !value) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!borrower) {
      toast.error('Please create a company profile first');
      return;
    }

    setIsSubmitting(true);

    try {
      const kpiData = selectedKPIData;
      if (!kpiData) throw new Error('Invalid KPI type');

      await submitKPI.mutateAsync({
        kpi_type: selectedKPI,
        category: kpiData.category as KPICategory,
        value: parseFloat(value),
        unit: kpiData.unit,
        period,
        baseline: baseline ? parseFloat(baseline) : undefined,
        target: target ? parseFloat(target) : undefined,
        notes: notes || undefined,
        files: files.length > 0 ? files : undefined,
      });

      // Reset form
      setSelectedKPI('');
      setValue('');
      setBaseline('');
      setTarget('');
      setNotes('');
      setFiles([]);
      setMlValidation(null);
    } catch (error) {
      // Error is handled by the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-primary" />
          Submit ESG KPI
        </CardTitle>
        <CardDescription>
          Add a new ESG metric with supporting documentation for verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* KPI Selection */}
          <div className="space-y-2">
            <Label htmlFor="kpi-type">KPI Type *</Label>
            <Select value={selectedKPI} onValueChange={(v) => setSelectedKPI(v as KPIType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a KPI metric" />
              </SelectTrigger>
              <SelectContent>
                {['environmental', 'social', 'governance'].map((category) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {category}
                    </div>
                    {KPI_DEFINITIONS
                      .filter(k => k.category === category)
                      .map(kpi => {
                        const Icon = categoryIcons[kpi.category];
                        return (
                          <SelectItem key={kpi.id} value={kpi.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {kpi.name}
                            </div>
                          </SelectItem>
                        );
                      })}
                  </div>
                ))}
              </SelectContent>
            </Select>
            {selectedKPIData && (
              <p className="text-sm text-muted-foreground">{selectedKPIData.description}</p>
            )}
          </div>

          {/* Value & Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Value *</Label>
              <div className="relative">
                <Input
                  id="value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  className="pr-16"
                />
                {selectedKPIData && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {selectedKPIData.unit}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Reporting Period *</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Baseline & Target */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline">Baseline Value</Label>
              <Input
                id="baseline"
                type="number"
                value={baseline}
                onChange={(e) => setBaseline(e.target.value)}
                placeholder="Previous period value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target Value</Label>
              <Input
                id="target"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Goal for this period"
              />
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-2">
            <Label>Supporting Documents</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                multiple
                accept=".pdf,.xlsx,.csv,.doc,.docx,.png,.jpg,.jpeg,image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop files or <span className="text-primary font-medium">browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Excel, CSV, Word (max 10MB each)
                </p>
              </label>
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <span>{file.name}</span>
                    <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context for verifiers..."
              rows={3}
            />
          </div>

          {/* ML Validation Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  AI-Powered Validation
                </h4>
                <p className="text-sm text-muted-foreground">
                  Run ML validation to check data consistency before submission
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleRunMLValidation}
                disabled={!selectedKPI || !value || isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Run Validation'
                )}
              </Button>
            </div>

            {mlValidation && (
              <div className={cn(
                'rounded-lg p-4 space-y-3',
                mlValidation.flags.length > 0 ? 'bg-pending/10' : 'bg-verified/10'
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confidence Score</span>
                  <span className="font-mono font-semibold">
                    {(mlValidation.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Anomaly Score</span>
                  <span className="font-mono">
                    {(mlValidation.anomaly_score * 100).toFixed(1)}%
                  </span>
                </div>
                {mlValidation.flags.length > 0 && (
                  <div className="flex items-center gap-2 text-pending">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">{mlValidation.flags.join(', ')}</span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  {mlValidation.recommendations.map((rec, i) => (
                    <p key={i}>• {rec}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !borrower}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit for Verification
              </>
            )}
          </Button>
          
          {!borrower && (
            <p className="text-sm text-muted-foreground text-center">
              Please create a company profile first to submit KPIs
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

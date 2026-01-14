import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMLInsights } from '@/hooks/useMLInsights';
import { KPI_DEFINITIONS } from '@/types/esg';
import { Brain, AlertTriangle, CheckCircle2, TrendingUp, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MLInsightsProps {
  borrowerId?: string;
}

export function MLInsights({ borrowerId }: MLInsightsProps) {
  const { validations, isLoading } = useMLInsights(borrowerId);

  const validationsWithDetails = validations.map(validation => {
    const metadata = KPI_DEFINITIONS.find(m => m.id === validation.kpi?.kpi_type);
    return { ...validation, metadata };
  });

  const getAnomalyLevel = (score: number) => {
    if (score < 0.2) return { label: 'Normal', color: 'text-verified', bg: 'bg-verified/10' };
    if (score < 0.4) return { label: 'Low Risk', color: 'text-pending', bg: 'bg-pending/10' };
    return { label: 'Review Needed', color: 'text-destructive', bg: 'bg-destructive/10' };
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (validationsWithDetails.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No ML validations available yet.</p>
            <p className="text-sm mt-2">AI insights are generated when KPIs are submitted.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent" />
          AI-Powered Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {validationsWithDetails.map((item) => {
            const anomalyLevel = getAnomalyLevel(Number(item.anomaly_score));
            
            return (
              <div
                key={item.id}
                className="border rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{item.metadata?.name || item.kpi?.kpi_type || 'Unknown KPI'}</h4>
                    <p className="text-sm text-muted-foreground">
                      Validated: {new Date(item.validated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={cn(anomalyLevel.bg, anomalyLevel.color, 'border-0')}>
                    {anomalyLevel.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Anomaly Score</p>
                    <div className="flex items-center gap-2">
                      {Number(item.anomaly_score) < 0.3 ? (
                        <CheckCircle2 className="h-4 w-4 text-verified" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-pending" />
                      )}
                      <span className="font-mono font-semibold">
                        {(Number(item.anomaly_score) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Model Confidence</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-mono font-semibold">
                        {(Number(item.confidence_score) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {item.flags && item.flags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {item.flags.map((flag, i) => (
                      <Badge key={i} variant="outline" className="text-pending border-pending">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {flag.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                )}

                {item.recommendations && item.recommendations.length > 0 && (
                  <div className="bg-primary/5 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-accent mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-1">AI Recommendations</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {item.recommendations.map((rec, i) => (
                            <li key={i}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ML Model Info */}
        <div className="mt-6 p-4 bg-accent/10 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            About AI Validation
          </h4>
          <p className="text-sm text-muted-foreground">
            Our ML models analyze submitted KPIs against historical data, sector benchmarks, and 
            time-series patterns. Anomaly detection flags unusual values, while confidence scoring 
            indicates how well the data aligns with expected patterns. This helps verifiers 
            prioritize reviews and catch potential data quality issues early.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

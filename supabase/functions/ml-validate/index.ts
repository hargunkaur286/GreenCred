import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AiChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

function getAiConfig() {
  const apiUrl = Deno.env.get('AI_API_URL');
  const apiKey = Deno.env.get('AI_API_KEY');
  const model = Deno.env.get('AI_MODEL') || 'gpt-4o-mini';

  if (!apiUrl || !apiKey) return null;
  return { apiUrl, apiKey, model };
}

async function runAiAnalysis(input: {
  kpiType: string;
  value: number;
  sectorKey: string;
  benchmarkMean: number;
  yoyChange: number | null;
  hasDocuments: boolean;
  anomalyScore: number;
}): Promise<string | null> {
  const cfg = getAiConfig();
  if (!cfg) return null;

  const res = await fetch(cfg.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        {
          role: 'system',
          content: 'You are an ESG data analyst. Analyze the KPI submission and provide concise data-quality insights and recommendations (max 100 words).'
        },
        {
          role: 'user',
          content: `KPI: ${input.kpiType}
Value: ${input.value}
Sector: ${input.sectorKey}
Benchmark Mean: ${input.benchmarkMean}
YoY Change: ${input.yoyChange !== null && Number.isFinite(input.yoyChange) ? (input.yoyChange * 100).toFixed(1) + '%' : 'N/A'}
Has Documents: ${input.hasDocuments}
Anomaly Score: ${input.anomalyScore.toFixed(2)}`
        }
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI request failed: ${res.status} ${text}`);
  }

  const json = (await res.json().catch(() => ({}))) as AiChatCompletionResponse;
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') return null;

  return content.trim();
}

function normalizeSector(raw: string | null | undefined): keyof typeof SECTOR_BENCHMARKS {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return 'default';

  // Common UI labels -> benchmark buckets
  if (s.includes('manufactur')) return 'manufacturing';
  if (s.includes('tech') || s.includes('software') || s.includes('it')) return 'technology';
  if (s.includes('finance') || s.includes('financial')) return 'finance';
  if (s.includes('energy') || s.includes('oil') || s.includes('gas') || s.includes('utilities')) return 'energy';
  if (s.includes('real estate') || s.includes('property')) return 'real_estate';
  if (s.includes('logistics') || s.includes('transport') || s.includes('shipping')) return 'logistics';

  // If the raw sector already matches a key, use it.
  if ((SECTOR_BENCHMARKS as any)[s]) return s as keyof typeof SECTOR_BENCHMARKS;
  return 'default';
}

// Sector benchmarks for ESG metrics (tons CO2e per $M revenue)
const SECTOR_BENCHMARKS: Record<string, Record<string, { mean: number; std: number }>> = {
  manufacturing: {
    scope1_emissions: { mean: 850, std: 300 },
    scope2_emissions: { mean: 400, std: 150 },
    scope3_emissions: { mean: 2500, std: 1000 },
    energy_consumption: { mean: 5000, std: 2000 },
    renewable_energy_percentage: { mean: 25, std: 15 },
    water_usage: { mean: 50000, std: 20000 },
    waste_generated: { mean: 500, std: 200 },
    diversity_ratio: { mean: 35, std: 10 },
    employee_turnover: { mean: 15, std: 5 },
    safety_incidents: { mean: 5, std: 3 },
    board_independence: { mean: 60, std: 15 },
    ethics_violations: { mean: 2, std: 2 },
  },
  technology: {
    scope1_emissions: { mean: 100, std: 50 },
    scope2_emissions: { mean: 500, std: 200 },
    scope3_emissions: { mean: 3000, std: 1500 },
    energy_consumption: { mean: 8000, std: 3000 },
    renewable_energy_percentage: { mean: 45, std: 20 },
    water_usage: { mean: 10000, std: 5000 },
    waste_generated: { mean: 100, std: 50 },
    diversity_ratio: { mean: 40, std: 12 },
    employee_turnover: { mean: 18, std: 6 },
    safety_incidents: { mean: 1, std: 1 },
    board_independence: { mean: 70, std: 12 },
    ethics_violations: { mean: 1, std: 1 },
  },
  finance: {
    scope1_emissions: { mean: 50, std: 25 },
    scope2_emissions: { mean: 200, std: 100 },
    scope3_emissions: { mean: 5000, std: 2500 },
    energy_consumption: { mean: 3000, std: 1200 },
    renewable_energy_percentage: { mean: 35, std: 18 },
    water_usage: { mean: 5000, std: 2000 },
    waste_generated: { mean: 50, std: 25 },
    diversity_ratio: { mean: 42, std: 10 },
    employee_turnover: { mean: 12, std: 4 },
    safety_incidents: { mean: 0.5, std: 0.5 },
    board_independence: { mean: 75, std: 10 },
    ethics_violations: { mean: 1, std: 1 },
  },
  energy: {
    scope1_emissions: { mean: 5000, std: 2000 },
    scope2_emissions: { mean: 800, std: 300 },
    scope3_emissions: { mean: 15000, std: 5000 },
    energy_consumption: { mean: 50000, std: 20000 },
    renewable_energy_percentage: { mean: 20, std: 15 },
    water_usage: { mean: 200000, std: 100000 },
    waste_generated: { mean: 2000, std: 1000 },
    diversity_ratio: { mean: 30, std: 10 },
    employee_turnover: { mean: 10, std: 4 },
    safety_incidents: { mean: 8, std: 4 },
    board_independence: { mean: 55, std: 15 },
    ethics_violations: { mean: 3, std: 2 },
  },
  real_estate: {
    scope1_emissions: { mean: 120, std: 60 },
    scope2_emissions: { mean: 600, std: 250 },
    scope3_emissions: { mean: 2000, std: 1000 },
    energy_consumption: { mean: 12000, std: 5000 },
    renewable_energy_percentage: { mean: 30, std: 18 },
    water_usage: { mean: 20000, std: 9000 },
    waste_generated: { mean: 120, std: 60 },
    diversity_ratio: { mean: 38, std: 12 },
    employee_turnover: { mean: 14, std: 5 },
    safety_incidents: { mean: 2, std: 2 },
    board_independence: { mean: 68, std: 12 },
    ethics_violations: { mean: 1, std: 1 },
  },
  logistics: {
    scope1_emissions: { mean: 1500, std: 600 },
    scope2_emissions: { mean: 300, std: 140 },
    scope3_emissions: { mean: 6000, std: 2500 },
    energy_consumption: { mean: 9000, std: 3500 },
    renewable_energy_percentage: { mean: 18, std: 12 },
    water_usage: { mean: 15000, std: 7000 },
    waste_generated: { mean: 220, std: 110 },
    diversity_ratio: { mean: 32, std: 10 },
    employee_turnover: { mean: 20, std: 7 },
    safety_incidents: { mean: 6, std: 3 },
    board_independence: { mean: 62, std: 14 },
    ethics_violations: { mean: 2, std: 2 },
  },
  default: {
    scope1_emissions: { mean: 500, std: 250 },
    scope2_emissions: { mean: 300, std: 150 },
    scope3_emissions: { mean: 2000, std: 1000 },
    energy_consumption: { mean: 5000, std: 2500 },
    renewable_energy_percentage: { mean: 30, std: 15 },
    water_usage: { mean: 30000, std: 15000 },
    waste_generated: { mean: 300, std: 150 },
    diversity_ratio: { mean: 38, std: 12 },
    employee_turnover: { mean: 15, std: 5 },
    safety_incidents: { mean: 3, std: 2 },
    board_independence: { mean: 65, std: 15 },
    ethics_violations: { mean: 2, std: 2 },
  },
};

// Calculate z-score for anomaly detection
function calculateZScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return Math.abs((value - mean) / std);
}

// Calculate anomaly score (0-1, higher = more anomalous)
function calculateAnomalyScore(zScore: number): number {
  // Using sigmoid-like transformation
  return Math.min(1, zScore / 4);
}

// Calculate confidence score based on multiple factors
function calculateConfidenceScore(
  value: number,
  benchmark: { mean: number; std: number },
  hasDocuments: boolean,
  yoyChange: number | null
): number {
  let score = 0.5; // Base score

  // Factor 1: How close to benchmark (within 2 std = good)
  const zScore = calculateZScore(value, benchmark.mean, benchmark.std);
  if (zScore < 1) score += 0.2;
  else if (zScore < 2) score += 0.1;
  else score -= 0.1;

  // Factor 2: Has supporting documents
  if (hasDocuments) score += 0.15;

  // Factor 3: YoY change reasonableness
  if (yoyChange !== null) {
    const absChange = Math.abs(yoyChange);
    if (absChange < 0.1) score += 0.1; // Very stable
    else if (absChange < 0.3) score += 0.05; // Reasonable change
    else if (absChange > 0.5) score -= 0.1; // Suspicious large change
  }

  return Math.max(0, Math.min(1, score));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { kpi_id, use_ai } = body;

    // Preview mode: allow running the same validation logic before a KPI is submitted.
    // Expected body: { sector, kpi_type, value, has_documents, yoy_change?, use_ai? }
    if (!kpi_id) {
      const sectorKey = normalizeSector(body.sector);
      const kpiType = body.kpi_type;
      const value = Number(body.value);
      const hasDocuments = Boolean(body.has_documents);
      const yoyChange = body.yoy_change === undefined ? null : Number(body.yoy_change);

      if (!kpiType || Number.isNaN(value)) {
        return new Response(
          JSON.stringify({ error: 'kpi_type and value are required for preview' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const benchmarks = SECTOR_BENCHMARKS[sectorKey] || SECTOR_BENCHMARKS.default;
      const kpiBenchmark = benchmarks[kpiType] || { mean: value, std: Math.max(1, Math.abs(value) * 0.3) };

      const zScore = calculateZScore(value, kpiBenchmark.mean, kpiBenchmark.std);
      const anomalyScore = calculateAnomalyScore(zScore);
      const confidenceScore = calculateConfidenceScore(value, kpiBenchmark, hasDocuments, yoyChange);

      const flags: string[] = [];
      const recommendations: string[] = [];

      if (anomalyScore > 0.5) {
        flags.push('HIGH_ANOMALY_SCORE');
        recommendations.push('Value significantly deviates from sector benchmarks - manual review recommended');
      }
      if (yoyChange !== null && !Number.isNaN(yoyChange) && Math.abs(yoyChange) > 0.3) {
        flags.push('LARGE_YOY_CHANGE');
        recommendations.push(`${yoyChange > 0 ? 'Increase' : 'Decrease'} of ${Math.abs(yoyChange * 100).toFixed(1)}% YoY requires explanation`);
      }
      if (!hasDocuments) {
        flags.push('NO_SUPPORTING_DOCS');
        recommendations.push('Upload supporting documentation to increase verification confidence');
      }
      if (value < 0 && !['yoy_change', 'net_emissions'].includes(kpiType)) {
        flags.push('NEGATIVE_VALUE');
        recommendations.push('Negative values are unusual for this KPI type');
      }

      // Optional AI analysis
      let aiAnalysis: string | null = null;
      if (use_ai) {
        try {
          aiAnalysis = await runAiAnalysis({
            kpiType,
            value,
            sectorKey,
            benchmarkMean: kpiBenchmark.mean,
            yoyChange,
            hasDocuments,
            anomalyScore,
          });
          if (aiAnalysis) {
            recommendations.push(`AI Analysis: ${aiAnalysis}`);
          } else {
            recommendations.push('AI analysis unavailable (not configured).');
          }
        } catch (aiError) {
          console.error('AI analysis error:', aiError);
          recommendations.push('AI analysis failed (temporary error).');
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          validation: {
            kpi_id: null,
            anomaly_score: anomalyScore,
            confidence_score: confidenceScore,
            flags,
            recommendations,
            sector_benchmark: kpiBenchmark.mean,
            yoy_change: yoyChange,
            ai_analysis: aiAnalysis,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ML validation for KPI: ${kpi_id}`);

    // Fetch KPI with borrower info
    const { data: kpi, error: kpiError } = await supabaseClient
      .from('kpi_submissions')
      .select(`
        *,
        borrower:borrowers(id, name, sector, size)
      `)
      .eq('id', kpi_id)
      .single();

    if (kpiError || !kpi) {
      console.error('KPI fetch error:', kpiError);
      return new Response(
        JSON.stringify({ error: 'KPI not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch supporting documents
    const { data: documents } = await supabaseClient
      .from('supporting_documents')
      .select('id')
      .eq('kpi_id', kpi_id);

    const hasDocuments = (documents && documents.length > 0) ? true : false;

    // Get historical data for YoY analysis
    const { data: historicalKpis } = await supabaseClient
      .from('kpi_submissions')
      .select('value, period')
      .eq('borrower_id', kpi.borrower_id)
      .eq('kpi_type', kpi.kpi_type)
      .neq('id', kpi_id)
      .order('period', { ascending: false })
      .limit(1);

    let yoyChange: number | null = null;
    if (historicalKpis && historicalKpis.length > 0) {
      const previousValue = historicalKpis[0].value;
      if (previousValue !== 0) {
        yoyChange = (kpi.value - previousValue) / previousValue;
      }
    }

    // Get sector benchmarks
    const sectorKey = normalizeSector(kpi.borrower?.sector);
    const benchmarks = SECTOR_BENCHMARKS[sectorKey] || SECTOR_BENCHMARKS.default;
    const kpiBenchmark = benchmarks[kpi.kpi_type] || { mean: kpi.value, std: kpi.value * 0.3 };

    // Calculate scores
    const zScore = calculateZScore(kpi.value, kpiBenchmark.mean, kpiBenchmark.std);
    const anomalyScore = calculateAnomalyScore(zScore);
    const confidenceScore = calculateConfidenceScore(kpi.value, kpiBenchmark, hasDocuments, yoyChange);

    // Generate flags and recommendations
    const flags: string[] = [];
    const recommendations: string[] = [];

    if (anomalyScore > 0.5) {
      flags.push('HIGH_ANOMALY_SCORE');
      recommendations.push('Value significantly deviates from sector benchmarks - manual review recommended');
    }

    if (yoyChange !== null && Math.abs(yoyChange) > 0.3) {
      flags.push('LARGE_YOY_CHANGE');
      recommendations.push(`${yoyChange > 0 ? 'Increase' : 'Decrease'} of ${Math.abs(yoyChange * 100).toFixed(1)}% YoY requires explanation`);
    }

    if (!hasDocuments) {
      flags.push('NO_SUPPORTING_DOCS');
      recommendations.push('Upload supporting documentation to increase verification confidence');
    }

    if (kpi.value < 0 && !['yoy_change', 'net_emissions'].includes(kpi.kpi_type)) {
      flags.push('NEGATIVE_VALUE');
      recommendations.push('Negative values are unusual for this KPI type');
    }

    // Optional AI analysis
    let aiAnalysis: string | null = null;
    if (use_ai) {
      try {
        aiAnalysis = await runAiAnalysis({
          kpiType: kpi.kpi_type,
          value: Number(kpi.value),
          sectorKey,
          benchmarkMean: kpiBenchmark.mean,
          yoyChange,
          hasDocuments,
          anomalyScore,
        });
        if (aiAnalysis) {
          recommendations.push(`AI Analysis: ${aiAnalysis}`);
        } else {
          recommendations.push('AI analysis unavailable (not configured).');
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        recommendations.push('AI analysis failed (temporary error).');
      }
    }

    // Store validation result
    const { data: validation, error: validationError } = await supabaseClient
      .from('ml_validations')
      .upsert({
        kpi_id,
        anomaly_score: anomalyScore,
        confidence_score: confidenceScore,
        flags,
        recommendations,
        sector_benchmark: kpiBenchmark.mean,
        yoy_change: yoyChange,
        validated_at: new Date().toISOString(),
      }, {
        onConflict: 'kpi_id'
      })
      .select()
      .single();

    if (validationError) {
      console.error('Validation storage error:', validationError);
    }

    console.log(`ML validation complete for KPI ${kpi_id}: anomaly=${anomalyScore.toFixed(2)}, confidence=${confidenceScore.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        success: true,
        validation: {
          kpi_id,
          anomaly_score: anomalyScore,
          confidence_score: confidenceScore,
          flags,
          recommendations,
          sector_benchmark: kpiBenchmark.mean,
          yoy_change: yoyChange,
          ai_analysis: aiAnalysis,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('ML validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

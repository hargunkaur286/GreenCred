import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate category score from KPIs
function calculateCategoryScore(kpis: any[], category: string): number {
  const categoryKpis = kpis.filter(k => k.category === category && k.status === 'verified');
  if (categoryKpis.length === 0) return 0;

  let totalScore = 0;
  let totalWeight = 0;

  for (const kpi of categoryKpis) {
    // Get verification confidence
    const verification = kpi.verifications?.[0];
    const confidence = verification?.confidence_score || 0.5;

    // Get ML validation confidence
    const mlValidation = kpi.ml_validations?.[0];
    const mlConfidence = mlValidation?.confidence_score || 0.5;

    // Calculate KPI score based on target achievement
    let achievementScore = 0.5;
    if (kpi.target && kpi.baseline) {
      const progress = (kpi.value - kpi.baseline) / (kpi.target - kpi.baseline);
      achievementScore = Math.max(0, Math.min(1, progress));
      
      // For metrics where lower is better (emissions, waste, etc.)
      if (['scope1_emissions', 'scope2_emissions', 'scope3_emissions', 'waste_generated', 
           'employee_turnover', 'safety_incidents', 'ethics_violations'].includes(kpi.kpi_type)) {
        achievementScore = 1 - achievementScore;
      }
    }

    // Combined score
    const kpiScore = (achievementScore * 0.5) + (confidence * 0.25) + (mlConfidence * 0.25);
    totalScore += kpiScore;
    totalWeight += 1;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey =
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration. Ensure URL and SERVICE_ROLE_KEY are set.');
      return new Response(
        JSON.stringify({
          error: 'Server misconfigured: missing URL and/or SERVICE_ROLE_KEY function secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // Require authentication (prevents anonymous users from generating passports).
    // Supports:
    // - End-user access tokens (normal app usage)
    // - Service role key as bearer (internal Edge Function calls)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const isSystemCall = token === serviceRoleKey;

    let userId: string | null = null;
    let userEmail: string | null = null;
    let actorRole: string = 'admin';

    if (!isSystemCall) {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = user.id;
      userEmail = user.email ?? null;

      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['borrower', 'verifier', 'lender', 'admin'].includes(profile.role)) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to generate passports' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      actorRole = profile.role;
    }

    const { borrower_id, is_public } = await req.json();

    if (!borrower_id) {
      return new Response(
        JSON.stringify({ error: 'borrower_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(
      `Generating ESG passport for borrower: ${borrower_id} (actor=${isSystemCall ? 'system' : userId ?? userEmail ?? 'unknown'})`
    );

    // Fetch borrower
    const { data: borrower, error: borrowerError } = await supabaseClient
      .from('borrowers')
      .select('*')
      .eq('id', borrower_id)
      .single();

    if (borrowerError || !borrower) {
      return new Response(
        JSON.stringify({ error: 'Borrower not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Borrowers can only generate passports for their own borrower record
    if (!isSystemCall && actorRole === 'borrower' && borrower.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Borrowers can only generate their own passport' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all KPIs with verifications and ML validations
    const { data: kpis, error: kpisError } = await supabaseClient
      .from('kpi_submissions')
      .select(`
        *,
        verifications(*),
        ml_validations(*),
        blockchain_attestations(*)
      `)
      .eq('borrower_id', borrower_id);

    if (kpisError) {
      console.error('KPIs fetch error:', kpisError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch KPIs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate category scores
    const environmentalScore = calculateCategoryScore(kpis || [], 'environmental');
    const socialScore = calculateCategoryScore(kpis || [], 'social');
    const governanceScore = calculateCategoryScore(kpis || [], 'governance');

    // Calculate overall score (weighted average)
    const overallScore = (environmentalScore * 0.4) + (socialScore * 0.3) + (governanceScore * 0.3);

    // Set validity period (1 year from generation)
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    // Upsert passport
    const { data: passport, error: passportError } = await supabaseClient
      .from('esg_passports')
      .upsert({
        borrower_id,
        overall_score: Math.round(overallScore * 100) / 100,
        environmental_score: Math.round(environmentalScore * 100) / 100,
        social_score: Math.round(socialScore * 100) / 100,
        governance_score: Math.round(governanceScore * 100) / 100,
        generated_at: new Date().toISOString(),
        valid_until: validUntil.toISOString(),
        is_public: !!is_public,
      }, {
        onConflict: 'borrower_id',
      })
      .select()
      .single();

    if (passportError) {
      console.error('Passport creation error:', passportError);
      return new Response(
        JSON.stringify({ error: 'Failed to create passport' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build passport response
    const passportData = {
      id: passport.id,
      borrower: {
        id: borrower.id,
        name: borrower.name,
        sector: borrower.sector,
        country: borrower.country,
        size: borrower.size,
      },
      scores: {
        overall: passport.overall_score,
        environmental: passport.environmental_score,
        social: passport.social_score,
        governance: passport.governance_score,
      },
      kpis: (kpis || []).map(kpi => ({
        id: kpi.id,
        type: kpi.kpi_type,
        category: kpi.category,
        value: kpi.value,
        unit: kpi.unit,
        period: kpi.period,
        baseline: kpi.baseline,
        target: kpi.target,
        status: kpi.status,
        verification: kpi.verifications?.[0] ? {
          verifier_name: kpi.verifications[0].verifier_name,
          confidence_score: kpi.verifications[0].confidence_score,
          verified_at: kpi.verifications[0].verified_at,
          expires_at: kpi.verifications[0].expires_at,
        } : null,
        blockchain: kpi.blockchain_attestations?.[0] ? {
          transaction_hash: kpi.blockchain_attestations[0].transaction_hash,
          network: kpi.blockchain_attestations[0].network,
          data_hash: kpi.blockchain_attestations[0].data_hash,
        } : null,
      })),
      generated_at: passport.generated_at,
      valid_until: passport.valid_until,
      is_public: passport.is_public,
    };

    console.log(`ESG passport generated: ${passport.id} with score ${passport.overall_score}`);

    return new Response(
      JSON.stringify({
        success: true,
        passport: passportData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Passport generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

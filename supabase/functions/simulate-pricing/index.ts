import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ESG score to basis points discount mapping
function calculateESGDiscount(overallScore: number, verifiedKpiCount: number, hasBlockchain: boolean): number {
  let baseBps = 0;

  // Score-based discount (0-30 bps)
  if (overallScore >= 0.9) baseBps = 30;
  else if (overallScore >= 0.8) baseBps = 25;
  else if (overallScore >= 0.7) baseBps = 20;
  else if (overallScore >= 0.6) baseBps = 15;
  else if (overallScore >= 0.5) baseBps = 10;
  else if (overallScore >= 0.4) baseBps = 5;

  // Bonus for verified KPIs (up to 10 bps)
  const verificationBonus = Math.min(10, verifiedKpiCount * 2);

  // Bonus for blockchain attestation (5 bps)
  const blockchainBonus = hasBlockchain ? 5 : 0;

  return baseBps + verificationBonus + blockchainBonus;
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

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is a lender
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['lender', 'admin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Only lenders can simulate pricing' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { borrower_id, base_rate, loan_amount } = await req.json();

    if (!borrower_id || base_rate === undefined) {
      return new Response(
        JSON.stringify({ error: 'borrower_id and base_rate are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Simulating pricing for borrower: ${borrower_id}`);

    // Fetch passport
    const { data: passport, error: passportError } = await supabaseClient
      .from('esg_passports')
      .select('*')
      .eq('borrower_id', borrower_id)
      .single();

    if (passportError || !passport) {
      // Generate passport if it doesn't exist
      const passportResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-passport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ borrower_id }),
        }
      );

      if (!passportResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to generate passport for pricing simulation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Refetch passport
    const { data: currentPassport } = await supabaseClient
      .from('esg_passports')
      .select('*')
      .eq('borrower_id', borrower_id)
      .single();

    // Count verified KPIs
    const { count: verifiedKpiCount } = await supabaseClient
      .from('kpi_submissions')
      .select('id', { count: 'exact' })
      .eq('borrower_id', borrower_id)
      .eq('status', 'verified');

    // Check for blockchain attestations
    const { count: attestationCount } = await supabaseClient
      .from('blockchain_attestations')
      .select('id', { count: 'exact' })
      .in('kpi_id', 
        await supabaseClient
          .from('kpi_submissions')
          .select('id')
          .eq('borrower_id', borrower_id)
          .then(({ data }) => data?.map(k => k.id) || [])
      );

    const hasBlockchain = (attestationCount || 0) > 0;
    const overallScore = currentPassport?.overall_score || 0;

    // Calculate discount
    const esgDiscountBps = calculateESGDiscount(overallScore, verifiedKpiCount || 0, hasBlockchain);
    const finalRate = Math.max(0, base_rate - (esgDiscountBps / 100));

    // Calculate potential savings
    let potentialSavings = null;
    if (loan_amount) {
      potentialSavings = (loan_amount * (esgDiscountBps / 10000)); // Annual savings
    }

    // Store simulation
    const { data: simulation, error: simError } = await supabaseClient
      .from('pricing_simulations')
      .insert({
        lender_id: user.id,
        borrower_id,
        base_rate,
        esg_discount_bps: esgDiscountBps,
        final_rate: finalRate,
        loan_amount,
        potential_savings: potentialSavings,
        simulated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (simError) {
      console.error('Simulation storage error:', simError);
    }

    console.log(`Pricing simulation: ${base_rate}% -> ${finalRate}% (${esgDiscountBps}bps discount)`);

    return new Response(
      JSON.stringify({
        success: true,
        simulation: {
          id: simulation?.id,
          borrower_id,
          esg_score: overallScore,
          verified_kpis: verifiedKpiCount || 0,
          has_blockchain_attestation: hasBlockchain,
          base_rate,
          esg_discount_bps: esgDiscountBps,
          final_rate: Math.round(finalRate * 1000) / 1000,
          loan_amount,
          potential_annual_savings: potentialSavings ? Math.round(potentialSavings) : null,
          breakdown: {
            score_discount: Math.min(30, Math.floor(overallScore * 30)),
            verification_bonus: Math.min(10, (verifiedKpiCount || 0) * 2),
            blockchain_bonus: hasBlockchain ? 5 : 0,
          },
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Pricing simulation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

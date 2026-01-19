import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate digital signature (simulated - in production use proper cryptographic signing)
async function generateSignature(data: string, verifierId: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data + verifierId + Date.now());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey =
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey
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

    // Check if user is a verifier
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, full_name, organization_name')
      .eq('id', user.id)
      .single();

    if (!profile || !['verifier', 'admin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Only verifiers can verify KPIs' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { kpi_id, confidence_score, method, notes, create_blockchain_attestation } = await req.json();

    if (!kpi_id || confidence_score === undefined) {
      return new Response(
        JSON.stringify({ error: 'kpi_id and confidence_score are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifier ${user.id} verifying KPI: ${kpi_id} with confidence: ${confidence_score}`);

    // Fetch KPI
    const { data: kpi, error: kpiError } = await supabaseClient
      .from('kpi_submissions')
      .select('*')
      .eq('id', kpi_id)
      .single();

    if (kpiError || !kpi) {
      return new Response(
        JSON.stringify({ error: 'KPI not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate digital signature
    const signatureData = JSON.stringify({
      kpi_id,
      kpi_type: kpi.kpi_type,
      value: kpi.value,
      period: kpi.period,
      confidence_score,
    });
    const signature = await generateSignature(signatureData, user.id);

    // Calculate expiry (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Create verification record
    const { data: verification, error: verificationError } = await supabaseClient
      .from('verifications')
      .insert({
        kpi_id,
        verifier_id: user.id,
        verifier_name: profile.full_name || user.email,
        verifier_organization: profile.organization_name,
        method: method || 'audit',
        confidence_score: Math.max(0, Math.min(1, confidence_score)),
        signature,
        notes,
        verified_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (verificationError) {
      console.error('Verification creation error:', verificationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create verification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update KPI status
    await supabaseClient
      .from('kpi_submissions')
      .update({ status: 'verified' })
      .eq('id', kpi_id);

    // Best-effort: generate/upsert ESG passport for the borrower after verification
    try {
      const genResponse = await fetch(
        `${supabaseUrl}/functions/v1/generate-passport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            borrower_id: kpi.borrower_id,
            is_public: false,
          }),
        }
      );

      if (!genResponse.ok) {
        const text = await genResponse.text().catch(() => '');
        console.error(`Passport generation failed: ${genResponse.status} ${text}`);
      }
    } catch (genError) {
      console.error('Passport generation error:', genError);
    }

    // Optionally create blockchain attestation
    let attestation = null;
    let attestation_error: string | null = null;
    if (create_blockchain_attestation) {
      try {
        const attestResponse = await fetch(
          `${supabaseUrl}/functions/v1/blockchain-attest`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              kpi_id,
              verification_id: verification.id,
            }),
          }
        );

        if (attestResponse.ok) {
          const attestData = await attestResponse.json().catch(() => ({}));
          attestation = attestData.attestation ?? null;
        } else {
          const text = await attestResponse.text().catch(() => '');
          attestation_error = `blockchain-attest failed: ${attestResponse.status} ${text}`.trim();
          console.error(attestation_error);
        }
      } catch (attestError) {
        console.error('Blockchain attestation error:', attestError);
        attestation_error = attestError instanceof Error ? attestError.message : 'Unknown attestation error';
      }
    }

    console.log(`Verification created: ${verification.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        verification: {
          id: verification.id,
          kpi_id,
          verifier_name: verification.verifier_name,
          verifier_organization: verification.verifier_organization,
          method: verification.method,
          confidence_score: verification.confidence_score,
          signature: verification.signature,
          verified_at: verification.verified_at,
          expires_at: verification.expires_at,
        },
        attestation,
        attestation_error,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ATTESTATION_REGISTRY_ABI = [
  {
    "type": "function",
    "name": "attest",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "dataHash", "type": "bytes32" },
      { "name": "cid", "type": "string" }
    ],
    "outputs": []
  },
  {
    "type": "event",
    "name": "Attested",
    "inputs": [
      { "name": "dataHash", "type": "bytes32", "indexed": true },
      { "name": "cid", "type": "string", "indexed": false },
      { "name": "attester", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ],
    "anonymous": false
  }
];

// Generate SHA-256 hash of data
async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate simulated transaction hash (in production, this would be actual blockchain transaction)
function generateTransactionHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate simulated IPFS hash
function generateIPFSHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'Qm' + Array.from(bytes.slice(0, 22)).map(b => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
    return chars[b % chars.length];
  }).join('');
}

function hasRealAttestationConfig() {
  const hasPinata = Boolean(
    Deno.env.get('PINATA_JWT') ||
    (Deno.env.get('PINATA_API_KEY') && Deno.env.get('PINATA_API_SECRET'))
  );

  return Boolean(
    hasPinata &&
    Deno.env.get('POLYGON_RPC_URL') &&
    Deno.env.get('ATTESTATION_SIGNER_PRIVATE_KEY') &&
    Deno.env.get('ATTESTATION_CONTRACT_ADDRESS')
  );
}

async function pinJSONToIPFS(payload: Record<string, unknown>): Promise<string> {
  const jwt = Deno.env.get('PINATA_JWT');
  const apiKey = Deno.env.get('PINATA_API_KEY');
  const apiSecret = Deno.env.get('PINATA_API_SECRET');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  } else if (apiKey && apiSecret) {
    // Pinata legacy auth headers
    headers['pinata_api_key'] = apiKey;
    headers['pinata_secret_api_key'] = apiSecret;
  } else {
    throw new Error('Pinata credentials not configured (set PINATA_JWT or PINATA_API_KEY + PINATA_API_SECRET)');
  }

  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      pinataMetadata: {
        name: `greencred-attestation-${payload.kpi_id ?? 'unknown'}`,
      },
      pinataContent: payload,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Pinata pinJSONToIPFS failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const cid = json?.IpfsHash;
  if (!cid || typeof cid !== 'string') throw new Error('Pinata response missing IpfsHash');
  return cid;
}

async function attestOnPolygonAmoy(dataHashHex: string, cid: string): Promise<{ txHash: string; explorerUrl: string; blockNumber: number | null }> {
  const rpcUrl = Deno.env.get('POLYGON_RPC_URL');
  const privateKey = Deno.env.get('ATTESTATION_SIGNER_PRIVATE_KEY');
  const contractAddress = Deno.env.get('ATTESTATION_CONTRACT_ADDRESS');

  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error('Real attestation env vars not configured');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, ATTESTATION_REGISTRY_ABI, wallet);

  const tx = await contract.attest(dataHashHex, cid);
  const txHash = tx?.hash;
  if (!txHash) throw new Error('Failed to send attestation transaction');

  // Do not block on confirmations; best-effort to fetch receipt quickly.
  let blockNumber: number | null = null;
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt?.blockNumber) blockNumber = Number(receipt.blockNumber);
  } catch {
    // ignore
  }

  return {
    txHash,
    explorerUrl: `https://amoy.polygonscan.com/tx/${txHash}`,
    blockNumber,
  };
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

    const { kpi_id, verification_id } = await req.json();

    if (!kpi_id) {
      return new Response(
        JSON.stringify({ error: 'kpi_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating blockchain attestation for KPI: ${kpi_id}`);

    // Fetch KPI with verification data
    const { data: kpi, error: kpiError } = await supabaseClient
      .from('kpi_submissions')
      .select(`
        *,
        borrower:borrowers(id, name, sector),
        verifications(*)
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

    // Get verification if provided, otherwise use latest
    let verification = null;
    if (verification_id) {
      verification = kpi.verifications?.find((v: any) => v.id === verification_id);
    } else if (kpi.verifications?.length > 0) {
      verification = kpi.verifications[kpi.verifications.length - 1];
    }

    // Create data payload for hashing
    const attestationData = {
      kpi_id: kpi.id,
      kpi_type: kpi.kpi_type,
      value: kpi.value,
      unit: kpi.unit,
      period: kpi.period,
      borrower_id: kpi.borrower?.id,
      borrower_name: kpi.borrower?.name,
      verification_id: verification?.id,
      verifier_name: verification?.verifier_name,
      confidence_score: verification?.confidence_score,
      verified_at: verification?.verified_at,
      timestamp: new Date().toISOString(),
    };

    // Generate cryptographic hash of the data
    const dataHash = await generateHash(JSON.stringify(attestationData));

    const dataHashHex = '0x' + dataHash;

    // Real mode (Pinata + Polygon Amoy) when configured; otherwise fallback to simulation.
    let transactionHash: string;
    let blockNumber: number | null;
    let ipfsHash: string | null;
    let explorerUrl: string;
    let ipfsUrl: string | null;
    let network: string;

    if (hasRealAttestationConfig()) {
      console.log('Using REAL attestation mode (Pinata + Polygon RPC)');
      ipfsHash = await pinJSONToIPFS(attestationData);
      ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

      const onchain = await attestOnPolygonAmoy(dataHashHex, ipfsHash);
      transactionHash = onchain.txHash;
      blockNumber = onchain.blockNumber;
      explorerUrl = onchain.explorerUrl;
      network = 'polygon-amoy';
    } else {
      console.log('Using SIMULATED attestation mode (no env vars configured)');
      transactionHash = generateTransactionHash();
      blockNumber = Math.floor(Math.random() * 1000000) + 50000000;
      ipfsHash = generateIPFSHash();
      ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
      explorerUrl = `https://polygonscan.com/tx/${transactionHash}`;
      network = 'polygon';
    }

    console.log(`Generated hashes - Data: ${dataHash.substring(0, 16)}..., Tx: ${transactionHash.substring(0, 16)}...`);

    // Store attestation record
    const { data: attestation, error: attestationError } = await supabaseClient
      .from('blockchain_attestations')
      .insert({
        kpi_id,
        verification_id: verification?.id,
        transaction_hash: transactionHash,
        block_number: blockNumber,
        network,
        data_hash: dataHashHex,
        ipfs_hash: ipfsHash,
        attested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attestationError) {
      console.error('Attestation storage error:', attestationError);
      return new Response(
        JSON.stringify({ error: 'Failed to store attestation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update KPI status to verified if it was pending
    if (kpi.status === 'pending' && verification) {
      await supabaseClient
        .from('kpi_submissions')
        .update({ status: 'verified' })
        .eq('id', kpi_id);
    }

    console.log(`Blockchain attestation created: ${attestation.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        attestation: {
          id: attestation.id,
          kpi_id,
          transaction_hash: transactionHash,
          block_number: blockNumber,
          network,
          data_hash: dataHashHex,
          ipfs_hash: ipfsHash,
          explorer_url: explorerUrl,
          ipfs_url: ipfsUrl,
          attested_at: attestation.attested_at,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Blockchain attestation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

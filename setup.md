# GreenCred — Setup Guide

This guide gets the project running end-to-end on a fresh machine.

It includes:

- Minimal local demo (fastest)
- Full Supabase setup
- Optional “real blockchain” mode (Pinata + Polygon Amoy)

> Note: This repo uses **Bun** (recommended) but also works with npm.

---

## 0) Prerequisites

- macOS/Linux/Windows
- Node.js 18+ (or 20+ recommended)
- Bun (recommended)
  - Install: https://bun.sh/
- Git

### Supabase CLI (required for full backend)

If you run `supabase status` and get `command not found` (exit code 127), install the CLI:

- macOS (Homebrew):
  - `brew install supabase/tap/supabase`
- Other OS / alternative installs:
  - https://supabase.com/docs/guides/cli

Verify:

- `supabase --version`

---

## 1) Install dependencies

From the repo root:

- With Bun:

  - `bun install`
  - `bun run dev`

- With npm:
  - `npm install`
  - `npm run dev`

The app runs on the Vite dev server (see terminal output; default config uses port 8080).

---

## 2) Environment variables (frontend)

Create a local `.env` file in the repo root (or update the existing one) with:

- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`

Where to get them:

- Supabase Dashboard → Project Settings → API
  - **Project URL** → `VITE_SUPABASE_URL`
  - **anon public** key → `VITE_SUPABASE_ANON_KEY`

> The frontend only needs anon credentials. Service role keys should NEVER be used in Vite `.env`.

---

## 3) Supabase project setup (recommended for judges)

### Option A — Use the hosted Supabase project (recommended)

If the team provides judges a hosted Supabase project:

1. Add the two frontend vars above.
2. Open the app and use the built-in Auth flow (`/auth`).

You should be able to:

- Sign up as Borrower / Lender / Verifier
- Submit KPIs + documents
- Verify KPIs (verifier)
- Generate/view ESG passport

### Option B — Create your own Supabase project (judges can do this)

1. Create a project

- https://supabase.com/ → New project

2. Link the repo to your project

- `supabase login`
- `supabase link --project-ref <PROJECT_REF>`
  - Find PROJECT_REF in Supabase Dashboard URL, or Settings.

3. Apply DB migrations

- `supabase db push`

4. Create storage bucket
   This project expects a bucket named:

- `documents`

Create it in:

- Supabase Dashboard → Storage → New bucket → `documents`

5. Deploy Edge Functions

- `supabase functions deploy generate-passport`
- `supabase functions deploy verify-kpi`
- `supabase functions deploy ml-validate`
- `supabase functions deploy ocr-document`
- `supabase functions deploy blockchain-attest`
- `supabase functions deploy simulate-pricing`

> If you don’t deploy the functions, features like passport generation/verification won’t work.

---

## 4) Supabase Edge Function secrets (backend env)

**Important:** setting `.env` locally does NOT automatically configure deployed Supabase functions.
You must set secrets via CLI.

At minimum, set:

- `SUPABASE_URL` (usually auto available in hosted functions, but safe to set)
- `SUPABASE_SERVICE_ROLE_KEY` (required by several functions)

Get service role key from:

- Supabase Dashboard → Project Settings → API → **service_role** key

Set secrets:

- `supabase secrets set SUPABASE_URL="https://<...>.supabase.co"`
- `supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<...>"`

View secrets (names only):

- `supabase secrets list`

---

## 5) “Real blockchain” mode (Optional, for full judging)

The app supports two modes:

- **Simulated mode** (default if not configured)
- **Real mode** (Pinata + Polygon Amoy)

Real mode is activated when ALL of these are set in Supabase secrets:

- Pinata (either auth method)
  - `PINATA_JWT` (recommended)
  - OR `PINATA_API_KEY` + `PINATA_API_SECRET`
- Polygon
  - `POLYGON_RPC_URL` (Amoy RPC)
- Signer wallet
  - `ATTESTATION_SIGNER_PRIVATE_KEY`
- Contract
  - `ATTESTATION_CONTRACT_ADDRESS`

### 5.1) Pinata keys

Create a Pinata account:

- https://pinata.cloud/

Option 1 (recommended):

- Create a JWT:
  - Pinata Dashboard → API Keys → New Key / JWT
  - Set `PINATA_JWT`

Option 2 (legacy):

- Create an API key/secret:
  - Pinata Dashboard → API Keys
  - Set `PINATA_API_KEY` and `PINATA_API_SECRET`

Then set Supabase secrets:

- `supabase secrets set PINATA_JWT="..."`
  - OR:
- `supabase secrets set PINATA_API_KEY="..." PINATA_API_SECRET="..."`

### 5.2) Polygon Amoy RPC URL

You need a JSON-RPC endpoint for **Polygon Amoy**.

Sources:

- Polygon docs (recommended testnet is Amoy)
- Public RPC providers (Alchemy/Infura/QuickNode/etc.)

Set:

- `supabase secrets set POLYGON_RPC_URL="https://..."`

### 5.3) Wallet private key (Amoy)

Create a dedicated wallet (for hackathon only), and fund it with Amoy test MATIC.

- Create wallet in MetaMask (test account)
- Get Amoy test MATIC from a faucet (Polygon Amoy faucet)

Set:

- `supabase secrets set ATTESTATION_SIGNER_PRIVATE_KEY="0x..."`

⚠️ Security note:

- This key can spend funds. Keep balance minimal.
- Never reuse a mainnet wallet.

### 5.4) Deploy the attestation contract (Polygon Amoy)

The Edge Function calls `attest(bytes32 dataHash, string cid)`.

Fastest path (Remix):

1. Open Remix: https://remix.ethereum.org/
2. Create `AttestationRegistry.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AttestationRegistry {
  event Attested(bytes32 indexed dataHash, string cid, address indexed attester, uint256 timestamp);

  function attest(bytes32 dataHash, string calldata cid) external {
    emit Attested(dataHash, cid, msg.sender, block.timestamp);
  }
}
```

3. Compile (Solidity 0.8.20+)
4. Deploy using MetaMask on Polygon Amoy
5. Copy deployed contract address

Set:

- `supabase secrets set ATTESTATION_CONTRACT_ADDRESS="0x..."`

### 5.5) Redeploy the blockchain function

After secrets are set:

- `supabase functions deploy blockchain-attest`

### 5.6) Verify it’s real

Once configured, a verified KPI should create a `blockchain_attestations` row with:

- `network = polygon-amoy`
- an Amoy Polygonscan tx link
- an IPFS CID pinned via Pinata

---

## 6) OCR configuration (Optional)

The project supports:

- Free PDF “embedded text extraction” (works for non-scanned PDFs)
- Self-hosted OCR via `OCR_SERVICE_URL`

To enable self-hosted OCR:

- Deploy your OCR service endpoint
- Set:
  - `supabase secrets set OCR_SERVICE_URL="https://your-ocr-service/..."`

If not configured:

- OCR works only for PDFs that contain selectable text.

---

## 7) Optional AI analysis for ML validation

The `ml-validate` Edge Function always returns deterministic validation results (benchmarks, anomaly score, flags, confidence, recommendations).

It also supports an optional `use_ai` mode that adds a short AI-generated analysis to the recommendations when configured.

To enable AI analysis, set these Supabase secrets:

- `AI_API_URL` — a chat-completions compatible endpoint URL
- `AI_API_KEY` — bearer token for that endpoint
- `AI_MODEL` (optional) — model name (default: `gpt-4o-mini`)

Example:

```bash
supabase secrets set \
  AI_API_URL="https://your-ai-endpoint.example.com/v1/chat/completions" \
  AI_API_KEY="YOUR_KEY" \
  AI_MODEL="gpt-4o-mini"
```

If these secrets are not set, `use_ai` requests will still succeed, but the response will omit AI content.

---

## 8) Common judge issues / fixes

### “Supabase CLI not found”

Install it (see section 0). `supabase status` returning exit code 127 means the CLI is missing.

### “Blockchain still looks simulated”

Real mode requires ALL of:

- Pinata auth (JWT OR key/secret)
- `POLYGON_RPC_URL`
- signer private key
- deployed contract address
- redeployed `blockchain-attest` function

### “Documents won’t open”

Ensure:

- Storage bucket `documents` exists
- RLS/policies are applied via migrations

---

## 9) Quick validation checklist (what judges should try)

- Create 3 users (one per role): Borrower, Verifier, Lender
- Borrower:
  - Submit KPIs + upload supporting docs
  - Generate ESG Passport (and optionally make it public)
- Verifier:
  - Review pending KPI and verify
  - (Optional) run OCR check (PDF-only)
- Lender:
  - View borrower list and open passports
- Blockchain:
  - If real mode configured, open the Polygonscan tx + Pinata IPFS link

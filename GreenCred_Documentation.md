# GreenCred

## Inspiration

Sustainability-linked loans (SLLs) have grown into **hundreds-of-billions** market, but recent trends highlight **credibility and data challenges**. Global SLL issuance nearly reached **$700 billion in 2022**, yet momentum slowed markedly in 2023. Regulators and investors grew wary of “greenwashed” targets and unreliable ESG reporting, leading to declining issuance as **questions around data credibility** persisted. We discovered that ESG performance data in SLL deals is often **fragmented and non-standardized**, making it difficult to reuse or trust.

**Industry guidelines provided a roadmap.** In 2023, the Loan Market Association (LMA) updated its SLL Principles to raise the bar on ESG data integrity – **borrowers must report on KPI performance and obtain independent external verification wherever possible**. The LMA guidance now emphasizes that SLL KPIs should be core to the borrower’s business, with targets beyond “business-as-usual” and not below historical performance. At the same time, an international coalition (LSTA, ACC, PRI, with LMA support) launched the **ESG Integrated Disclosure Project (ESG IDP)** to help standardize borrower ESG data.

## What it does

GreenCred is an end-to-end solution for managing sustainability-linked loan KPIs and performance **across all stakeholders**:

- **Borrower Dashboard**: Submit ESG KPI values, upload supporting documents, run ML-based validation for anomalies, and generate an ESG Passport.
- **Verifier Dashboard**: Access submitted KPIs, review confidence scores and anomalies, optionally run OCR checks (PDF text extraction by default; full OCR can be enabled via a self-hosted OCR service), and sign off verified KPIs.
- **Lender Portal**: View ESG Passports, simulate loan pricing based on performance, and view audit trails via blockchain attestations.
- **ESG Passport**: A shareable ESG disclosure inspired by LMA/IDP-style reporting, including verified KPI values, targets, and confidence signals.
- **Blockchain Audit Trail**: Each verification is hashed and recorded as an attestation (simulated by default; can be made real with Pinata + Polygon Amoy), with an IPFS CID in real mode.

## How we built it

- **Frontend**: Vite + React + TypeScript SPA with role-based dashboards.
- **Backend**: Supabase (Auth + Postgres + Storage + Edge Functions).
- **OCR**:

  - Free baseline: PDF embedded-text extraction (works for non-scanned PDFs)
  - Optional: self-hosted OCR via `OCR_SERVICE_URL`

- **ML validation**: deterministic edge-function scoring (benchmark + anomaly + confidence) used both for preview and for submitted KPIs.
- **Blockchain**:

  - Default: simulated attestations for demo
  - Real mode (optional): Pinata (IPFS pin) + Polygon Amoy transaction when secrets + contract are configured

- **PDF Export**: ESG Passport export + share link + QR code.

## Challenges we ran into

- Schema standardization based on ESG IDP while supporting custom KPIs.
- Designing intuitive blockchain UX with hash explorer integration.
- Designing verification UX that is transparent without overwhelming users.
- OCR reliability tradeoffs: free PDF text extraction works well for text PDFs, but scanned documents require a self-hosted OCR service.
- Role-specific workflows without feature entanglement.

## Accomplishments that we're proud of

- Fully functional prototype across borrower, verifier, and lender workflows.
- Working anomaly/confidence scoring and PDF-first OCR checks to speed up verification.
- Blockchain record logging with explorer links (simulated by default; real mode supported when configured).
- Clean and aligned ESG Passport output with export features.

## What we learned

- ESG lending credibility issues stem from fragmented, unverifiable reporting.
- Role clarity (borrower/verifier/lender) and auditability are crucial for trust.
- Automation with ML/OCR/blockchain can meaningfully improve ESG data quality and usability.
- Regulatory alignment with LMA, IDP, CSRD, and SFDR is key for adoption.

## What's next for GreenCred

- On-chain verifier signature system with DID/wallet attestation.
- Integration with carbon accounting tools like Normative/Watershed.
- CSRD + SFDR-compliant export modules for regulatory disclosures.
- Industry benchmarking analytics engine based on anonymized KPI data.

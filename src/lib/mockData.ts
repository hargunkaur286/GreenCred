import { Borrower, KPIValue, VerificationRecord, ESGPassport, BlockchainAttestation, MLValidation } from '@/types/esg';

// Mock borrowers data
export const mockBorrowers: Borrower[] = [
  {
    id: 'b-4029',
    name: 'GreenTech Manufacturing Ltd.',
    sector: 'Manufacturing',
    country: 'United Kingdom',
    size: 'medium',
    created_at: '2024-01-15',
  },
  {
    id: 'b-3011',
    name: 'EcoEnergy Solutions',
    sector: 'Energy',
    country: 'Germany',
    size: 'large',
    created_at: '2024-02-20',
  },
  {
    id: 'b-5102',
    name: 'Sustainable Logistics Corp',
    sector: 'Transportation',
    country: 'Netherlands',
    size: 'medium',
    created_at: '2024-03-10',
  },
];

// Mock KPI values
export const mockKPIs: KPIValue[] = [
  {
    id: 'kpi-001',
    kpi_type: 'scope1_emissions',
    value: 10000,
    unit: 'tons CO2e',
    period: '2023',
    baseline: 12500,
    target: 8000,
    supporting_docs: ['audit_2023.pdf', 'emissions_report.pdf'],
    created_at: '2024-01-20',
    updated_at: '2024-01-20',
  },
  {
    id: 'kpi-002',
    kpi_type: 'scope2_emissions',
    value: 5500,
    unit: 'tons CO2e',
    period: '2023',
    baseline: 7000,
    target: 4500,
    supporting_docs: ['energy_audit.pdf'],
    created_at: '2024-01-20',
    updated_at: '2024-01-20',
  },
  {
    id: 'kpi-003',
    kpi_type: 'renewable_energy_percentage',
    value: 45,
    unit: '%',
    period: '2023',
    baseline: 30,
    target: 60,
    supporting_docs: ['renewable_certificate.pdf'],
    created_at: '2024-01-20',
    updated_at: '2024-01-20',
  },
  {
    id: 'kpi-004',
    kpi_type: 'diversity_ratio',
    value: 38,
    unit: '%',
    period: '2023',
    baseline: 32,
    target: 45,
    supporting_docs: ['hr_report.pdf'],
    created_at: '2024-01-20',
    updated_at: '2024-01-20',
  },
  {
    id: 'kpi-005',
    kpi_type: 'board_independence',
    value: 67,
    unit: '%',
    period: '2023',
    baseline: 55,
    target: 75,
    supporting_docs: ['governance_report.pdf'],
    created_at: '2024-01-20',
    updated_at: '2024-01-20',
  },
];

// Mock verification records
export const mockVerifications: VerificationRecord[] = [
  {
    id: 'ver-001',
    kpi_id: 'kpi-001',
    verifier_id: 'veri-948',
    verifier_name: 'KPMG Sustainability Assurance',
    method: 'audit',
    confidence_score: 0.92,
    signature: '0x7a3b2c1d...',
    verified_at: '2024-02-15',
    expires_at: '2025-02-15',
    notes: 'Limited assurance engagement per ISAE 3000',
  },
  {
    id: 'ver-002',
    kpi_id: 'kpi-002',
    verifier_id: 'veri-948',
    verifier_name: 'KPMG Sustainability Assurance',
    method: 'audit',
    confidence_score: 0.89,
    signature: '0x8b4c3d2e...',
    verified_at: '2024-02-15',
    expires_at: '2025-02-15',
  },
  {
    id: 'ver-003',
    kpi_id: 'kpi-003',
    verifier_id: 'veri-102',
    verifier_name: 'CarbonVeritas Ltd.',
    method: 'third_party',
    confidence_score: 0.95,
    signature: '0x9c5d4e3f...',
    verified_at: '2024-02-20',
    expires_at: '2025-02-20',
  },
];

// Mock blockchain attestations
export const mockBlockchainAttestations: BlockchainAttestation[] = [
  {
    id: 'bc-001',
    kpi_id: 'kpi-001',
    transaction_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    block_number: 45678901,
    network: 'polygon',
    timestamp: '2024-02-15T14:30:00Z',
    ipfs_hash: 'QmXyz123abc456def789ghi012jkl345mno678pqr901stu',
  },
  {
    id: 'bc-002',
    kpi_id: 'kpi-002',
    transaction_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    block_number: 45678902,
    network: 'polygon',
    timestamp: '2024-02-15T14:35:00Z',
    ipfs_hash: 'QmAbc456def789ghi012jkl345mno678pqr901stu234vwx',
  },
];

// Mock ML validations
export const mockMLValidations: MLValidation[] = [
  {
    id: 'ml-001',
    kpi_id: 'kpi-001',
    anomaly_score: 0.12,
    confidence_score: 0.88,
    flags: [],
    recommendations: ['Value within expected range for manufacturing sector'],
    validated_at: '2024-02-10',
  },
  {
    id: 'ml-002',
    kpi_id: 'kpi-003',
    anomaly_score: 0.05,
    confidence_score: 0.94,
    flags: [],
    recommendations: ['Excellent progress towards renewable energy target'],
    validated_at: '2024-02-10',
  },
  {
    id: 'ml-003',
    kpi_id: 'kpi-004',
    anomaly_score: 0.35,
    confidence_score: 0.76,
    flags: ['REVIEW_RECOMMENDED'],
    recommendations: ['Diversity improvement rate above sector average - recommend verification of methodology'],
    validated_at: '2024-02-10',
  },
];

// Mock ESG Passport
export const mockESGPassport: ESGPassport = {
  id: 'passport-001',
  borrower: mockBorrowers[0],
  kpis: mockKPIs,
  verifications: mockVerifications,
  blockchain_attestations: mockBlockchainAttestations,
  ml_validations: mockMLValidations,
  overall_score: 78,
  generated_at: '2024-02-25',
  valid_until: '2025-02-25',
};

// Stats for dashboards
export const borrowerStats = {
  totalKPIs: 12,
  verifiedKPIs: 8,
  pendingKPIs: 3,
  expiredKPIs: 1,
  overallScore: 78,
  scoreChange: 5,
};

export const lenderStats = {
  totalBorrowers: 24,
  verifiedBorrowers: 18,
  pendingReviews: 6,
  avgESGScore: 72,
  totalLoansValue: 450000000,
};

export const verifierStats = {
  pendingReviews: 12,
  completedThisMonth: 28,
  avgConfidenceScore: 0.89,
  totalVerifications: 156,
};

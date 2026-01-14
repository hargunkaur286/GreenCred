// ESG Data Types for GreenCred Platform

export type KPICategory = 'environmental' | 'social' | 'governance';

export type KPIType = 
  | 'scope1_emissions'
  | 'scope2_emissions'
  | 'scope3_emissions'
  | 'energy_consumption'
  | 'renewable_energy_percentage'
  | 'water_usage'
  | 'waste_generated'
  | 'diversity_ratio'
  | 'employee_turnover'
  | 'safety_incidents'
  | 'board_independence'
  | 'ethics_violations';

export type VerificationStatus = 'pending' | 'verified' | 'expired' | 'rejected';

export interface KPIMetadata {
  id: KPIType;
  name: string;
  category: KPICategory;
  unit: string;
  description: string;
}

export interface KPIValue {
  id: string;
  kpi_type: KPIType;
  value: number;
  unit: string;
  period: string;
  baseline?: number;
  target?: number;
  supporting_docs: string[];
  created_at: string;
  updated_at: string;
}

export interface VerificationRecord {
  id: string;
  kpi_id: string;
  verifier_id: string;
  verifier_name: string;
  method: 'audit' | 'third_party' | 'self_declared';
  confidence_score: number;
  signature: string;
  verified_at: string;
  expires_at: string;
  notes?: string;
}

export interface BlockchainAttestation {
  id: string;
  kpi_id: string;
  transaction_hash: string;
  block_number: number;
  network: 'polygon' | 'ethereum';
  timestamp: string;
  ipfs_hash?: string;
}

export interface MLValidation {
  id: string;
  kpi_id: string;
  anomaly_score: number;
  confidence_score: number;
  flags: string[];
  recommendations: string[];
  validated_at: string;
}

export interface Borrower {
  id: string;
  name: string;
  sector: string;
  country: string;
  size: 'small' | 'medium' | 'large';
  created_at: string;
}

export interface ESGPassport {
  id: string;
  borrower: Borrower;
  kpis: KPIValue[];
  verifications: VerificationRecord[];
  blockchain_attestations: BlockchainAttestation[];
  ml_validations: MLValidation[];
  overall_score: number;
  generated_at: string;
  valid_until: string;
}

// LMA Alignment mapping
export const LMA_PRINCIPLES = {
  KPI_MATERIALITY: 'Structured by sector, selected from LMA guidance',
  SPT_AMBITION: 'Users set baseline & targets with industry benchmarks',
  REPORTING: 'ESG Passport exports annual performance for lenders',
  VERIFICATION: 'External reviewers sign off KPIs with metadata',
  STANDARDIZATION: 'Follows ESG IDP + LMA SLLP 2025 data formats',
} as const;

// Available KPI definitions based on LMA/ESG IDP
export const KPI_DEFINITIONS: KPIMetadata[] = [
  {
    id: 'scope1_emissions',
    name: 'Scope 1 Emissions',
    category: 'environmental',
    unit: 'tons CO2e',
    description: 'Direct GHG emissions from owned/controlled sources',
  },
  {
    id: 'scope2_emissions',
    name: 'Scope 2 Emissions',
    category: 'environmental',
    unit: 'tons CO2e',
    description: 'Indirect GHG emissions from purchased energy',
  },
  {
    id: 'scope3_emissions',
    name: 'Scope 3 Emissions',
    category: 'environmental',
    unit: 'tons CO2e',
    description: 'All other indirect emissions in value chain',
  },
  {
    id: 'energy_consumption',
    name: 'Total Energy Consumption',
    category: 'environmental',
    unit: 'MWh',
    description: 'Total energy consumed from all sources',
  },
  {
    id: 'renewable_energy_percentage',
    name: 'Renewable Energy %',
    category: 'environmental',
    unit: '%',
    description: 'Percentage of energy from renewable sources',
  },
  {
    id: 'water_usage',
    name: 'Water Usage',
    category: 'environmental',
    unit: 'm³',
    description: 'Total water consumption',
  },
  {
    id: 'waste_generated',
    name: 'Waste Generated',
    category: 'environmental',
    unit: 'tons',
    description: 'Total waste generated from operations',
  },
  {
    id: 'diversity_ratio',
    name: 'Workforce Diversity',
    category: 'social',
    unit: '%',
    description: 'Percentage of underrepresented groups in workforce',
  },
  {
    id: 'employee_turnover',
    name: 'Employee Turnover Rate',
    category: 'social',
    unit: '%',
    description: 'Annual employee turnover percentage',
  },
  {
    id: 'safety_incidents',
    name: 'Safety Incidents',
    category: 'social',
    unit: 'incidents/year',
    description: 'Number of workplace safety incidents',
  },
  {
    id: 'board_independence',
    name: 'Board Independence',
    category: 'governance',
    unit: '%',
    description: 'Percentage of independent board members',
  },
  {
    id: 'ethics_violations',
    name: 'Ethics Violations',
    category: 'governance',
    unit: 'incidents/year',
    description: 'Number of reported ethics violations',
  },
];

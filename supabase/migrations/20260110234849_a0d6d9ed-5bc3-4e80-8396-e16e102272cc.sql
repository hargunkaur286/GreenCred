-- Create enum types
CREATE TYPE public.user_role AS ENUM ('borrower', 'verifier', 'lender', 'admin');
CREATE TYPE public.kpi_category AS ENUM ('environmental', 'social', 'governance');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'expired', 'rejected');
CREATE TYPE public.verification_method AS ENUM ('audit', 'third_party', 'self_declared');
CREATE TYPE public.company_size AS ENUM ('small', 'medium', 'large');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'borrower',
  organization_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles table (for fine-grained access control)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Borrowers/Companies table
CREATE TABLE public.borrowers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  country TEXT NOT NULL,
  size company_size NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KPI Submissions table
CREATE TABLE public.kpi_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID REFERENCES public.borrowers(id) ON DELETE CASCADE NOT NULL,
  kpi_type TEXT NOT NULL,
  category kpi_category NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  period TEXT NOT NULL,
  baseline NUMERIC,
  target NUMERIC,
  notes TEXT,
  status verification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supporting documents table
CREATE TABLE public.supporting_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID REFERENCES public.kpi_submissions(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ML Validations table
CREATE TABLE public.ml_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID REFERENCES public.kpi_submissions(id) ON DELETE CASCADE NOT NULL,
  anomaly_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  flags TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  sector_benchmark NUMERIC,
  yoy_change NUMERIC,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verifications table
CREATE TABLE public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID REFERENCES public.kpi_submissions(id) ON DELETE CASCADE NOT NULL,
  verifier_id UUID REFERENCES auth.users(id) NOT NULL,
  verifier_name TEXT NOT NULL,
  verifier_organization TEXT,
  method verification_method NOT NULL DEFAULT 'audit',
  confidence_score NUMERIC NOT NULL,
  signature TEXT NOT NULL,
  notes TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Blockchain attestations table
CREATE TABLE public.blockchain_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID REFERENCES public.kpi_submissions(id) ON DELETE CASCADE NOT NULL,
  verification_id UUID REFERENCES public.verifications(id) ON DELETE CASCADE,
  transaction_hash TEXT NOT NULL UNIQUE,
  block_number INTEGER,
  network TEXT NOT NULL DEFAULT 'polygon',
  data_hash TEXT NOT NULL,
  ipfs_hash TEXT,
  attested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ESG Passports table
CREATE TABLE public.esg_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID REFERENCES public.borrowers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  environmental_score NUMERIC,
  social_score NUMERIC,
  governance_score NUMERIC,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE
);

-- Pricing simulations table (for lenders)
CREATE TABLE public.pricing_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id UUID REFERENCES auth.users(id) NOT NULL,
  borrower_id UUID REFERENCES public.borrowers(id) ON DELETE CASCADE NOT NULL,
  base_rate NUMERIC NOT NULL,
  esg_discount_bps NUMERIC NOT NULL DEFAULT 0,
  final_rate NUMERIC NOT NULL,
  loan_amount NUMERIC,
  potential_savings NUMERIC,
  simulated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supporting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esg_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_simulations ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Borrowers policies
CREATE POLICY "Borrowers can manage their own company" ON public.borrowers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Verifiers and lenders can view all borrowers" ON public.borrowers
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('verifier', 'lender', 'admin')
  );

-- KPI submissions policies
CREATE POLICY "Borrowers can manage their KPIs" ON public.kpi_submissions
  FOR ALL USING (
    borrower_id IN (SELECT id FROM public.borrowers WHERE user_id = auth.uid())
  );

CREATE POLICY "Verifiers and lenders can view all KPIs" ON public.kpi_submissions
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('verifier', 'lender', 'admin')
  );

CREATE POLICY "Verifiers can update KPI status" ON public.kpi_submissions
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) IN ('verifier', 'admin')
  );

-- Supporting documents policies
CREATE POLICY "Borrowers can manage their documents" ON public.supporting_documents
  FOR ALL USING (
    kpi_id IN (
      SELECT ks.id FROM public.kpi_submissions ks
      JOIN public.borrowers b ON ks.borrower_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "Verifiers and lenders can view documents" ON public.supporting_documents
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('verifier', 'lender', 'admin')
  );

-- ML validations policies
CREATE POLICY "Anyone can view ML validations for their accessible KPIs" ON public.ml_validations
  FOR SELECT USING (TRUE);

CREATE POLICY "System can insert ML validations" ON public.ml_validations
  FOR INSERT WITH CHECK (TRUE);

-- Verifications policies
CREATE POLICY "Verifiers can create verifications" ON public.verifications
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('verifier', 'admin')
  );

CREATE POLICY "Anyone can view verifications" ON public.verifications
  FOR SELECT USING (TRUE);

-- Blockchain attestations policies
CREATE POLICY "Anyone can view blockchain attestations" ON public.blockchain_attestations
  FOR SELECT USING (TRUE);

CREATE POLICY "System can insert attestations" ON public.blockchain_attestations
  FOR INSERT WITH CHECK (TRUE);

-- ESG Passports policies
CREATE POLICY "Borrowers can view their passport" ON public.esg_passports
  FOR SELECT USING (
    borrower_id IN (SELECT id FROM public.borrowers WHERE user_id = auth.uid())
  );

CREATE POLICY "Verifiers and lenders can view all passports" ON public.esg_passports
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('verifier', 'lender', 'admin')
  );

CREATE POLICY "Public passports are viewable" ON public.esg_passports
  FOR SELECT USING (is_public = TRUE);

-- Pricing simulations policies
CREATE POLICY "Lenders can manage their simulations" ON public.pricing_simulations
  FOR ALL USING (auth.uid() = lender_id);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'borrower')
  );
  
  -- Also insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'borrower')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add timestamp triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_borrowers_updated_at
  BEFORE UPDATE ON public.borrowers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_kpi_submissions_updated_at
  BEFORE UPDATE ON public.kpi_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
  );
-- Fix search_path for update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix ML validations insert policy - only allow through edge functions with service role
DROP POLICY IF EXISTS "System can insert ML validations" ON public.ml_validations;
CREATE POLICY "Service role can insert ML validations" ON public.ml_validations
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Fix blockchain attestations insert policy
DROP POLICY IF EXISTS "System can insert attestations" ON public.blockchain_attestations;
CREATE POLICY "Service role can insert attestations" ON public.blockchain_attestations
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Add ESG passport management policies
CREATE POLICY "Service role can manage passports" ON public.esg_passports
  FOR ALL USING (auth.role() = 'service_role');

-- Add update policy for ML validations (for service role)
CREATE POLICY "Service role can update ML validations" ON public.ml_validations
  FOR UPDATE USING (auth.role() = 'service_role');
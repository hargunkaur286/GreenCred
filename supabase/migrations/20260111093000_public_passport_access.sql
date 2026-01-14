-- Allow public (anon) access to borrower + verified KPIs only when a borrower has a public passport.
-- This enables /passport/:id public viewing without granting access to drafts/pending submissions.
-- Borrowers: public can read borrower rows that have a public passport
DROP POLICY IF EXISTS "Public can view borrowers with public passports" ON public.borrowers;
CREATE POLICY "Public can view borrowers with public passports" ON public.borrowers FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.esg_passports p
            WHERE p.borrower_id = borrowers.id
                AND p.is_public = TRUE
        )
    );
-- KPI submissions: public can read VERIFIED KPI rows for borrowers that have a public passport
DROP POLICY IF EXISTS "Public can view verified KPIs for public passports" ON public.kpi_submissions;
CREATE POLICY "Public can view verified KPIs for public passports" ON public.kpi_submissions FOR
SELECT USING (
        status = 'verified'
        AND EXISTS (
            SELECT 1
            FROM public.esg_passports p
            WHERE p.borrower_id = kpi_submissions.borrower_id
                AND p.is_public = TRUE
        )
    );
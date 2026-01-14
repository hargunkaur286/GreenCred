import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjsLib from "npm:pdfjs-dist@4.0.379/legacy/build/pdf.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isPdfDocument(fileName: string, fileType: string) {
  const name = (fileName || '').toLowerCase();
  const type = (fileType || '').toLowerCase();
  return type.includes('pdf') || name.endsWith('.pdf');
}

function extractNumbers(text: string): number[] {
  const matches = text.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?/g) || [];
  const numbers = matches
    .map((m) => Number(m.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n));
  return numbers;
}

async function extractPdfTextFromUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
    const ab = await res.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(ab) });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as any[]).map((it) => it?.str || '').join(' ');
      text += pageText + '\n';
    }
    return text.trim();
  } finally {
    clearTimeout(timeout);
  }
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

    const { document_id, kpi_id, expected_value, expected_unit } = await req.json();

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: 'document_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing OCR for document: ${document_id}`);

    // Fetch document
    const { data: document, error: docError } = await supabaseClient
      .from('supporting_documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preferred: call a self-hosted OCR service (free to run locally / on a cheap VM)
    // Configure via OCR_SERVICE_URL env var.
    const OCR_SERVICE_URL = Deno.env.get('OCR_SERVICE_URL');

    // Fetch KPI details if provided
    let kpiDetails = null;
    if (kpi_id) {
      const { data: kpi } = await supabaseClient
        .from('kpi_submissions')
        .select('*')
        .eq('id', kpi_id)
        .single();
      kpiDetails = kpi;
    }

    if (OCR_SERVICE_URL) {
      // Generate a short-lived signed URL so the OCR service can fetch the document bytes.
      const { data: signed, error: signedErr } = await supabaseClient
        .storage
        .from('documents')
        .createSignedUrl(document.file_path, 60);

      if (signedErr || !signed?.signedUrl) {
        console.error('Signed URL error:', signedErr);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create signed URL for OCR',
            extracted_value: null,
            match_confidence: 0,
            is_match: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const expectedValue = expected_value ?? kpiDetails?.value;
      const expectedUnit = expected_unit ?? kpiDetails?.unit;

      const ocrRes = await fetch(`${OCR_SERVICE_URL.replace(/\/$/, '')}/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id,
          file_name: document.file_name,
          file_type: document.file_type,
          file_url: signed.signedUrl,
          expected_value: expectedValue,
          expected_unit: expectedUnit,
          kpi_type: kpiDetails?.kpi_type,
          period: kpiDetails?.period,
        }),
      });

      if (!ocrRes.ok) {
        const text = await ocrRes.text().catch(() => '');
        return new Response(
          JSON.stringify({ 
            error: `Self-hosted OCR failed: ${ocrRes.status} ${text}`,
            extracted_value: null,
            match_confidence: 0,
            is_match: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ocrJson = await ocrRes.json();
      return new Response(
        JSON.stringify({ success: true, ocr_result: ocrJson?.ocr_result ?? ocrJson }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Free fallback for PDFs: extract embedded text with pdf.js (works for non-scanned PDFs)
    if (isPdfDocument(document.file_name, document.file_type)) {
      const { data: signed, error: signedErr } = await supabaseClient
        .storage
        .from('documents')
        .createSignedUrl(document.file_path, 60);

      if (signedErr || !signed?.signedUrl) {
        return new Response(
          JSON.stringify({
            error: 'Failed to create signed URL for PDF extraction',
            extracted_value: null,
            match_confidence: 0,
            is_match: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const expectedValue = expected_value ?? kpiDetails?.value;
      const expectedUnit = expected_unit ?? kpiDetails?.unit;

      const text = await extractPdfTextFromUrl(signed.signedUrl);
      if (!text) {
        return new Response(
          JSON.stringify({
            success: true,
            ocr_result: {
              document_id,
              file_name: document.file_name,
              extracted_value: null,
              extracted_unit: expectedUnit ?? null,
              document_type: 'other',
              ocr_confidence: 0.1,
              relevant_text: '',
              expected_value: expectedValue,
              is_match: false,
              match_confidence: 0,
              match_analysis: 'No embedded text found in PDF (likely scanned). PDF-only text extraction cannot read images.',
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const numbers = extractNumbers(text);
      let extractedValue: number | null = null;
      let isMatch = false;
      let matchConfidence = 0.2;
      let matchAnalysis = 'Extracted numbers from PDF text.';

      if (typeof expectedValue === 'number' && Number.isFinite(expectedValue) && numbers.length > 0) {
        // Choose closest numeric value in the PDF to expected
        let best = numbers[0];
        let bestRel = Math.abs(best - expectedValue) / (Math.abs(expectedValue) || 1);
        for (const n of numbers) {
          const rel = Math.abs(n - expectedValue) / (Math.abs(expectedValue) || 1);
          if (rel < bestRel) {
            best = n;
            bestRel = rel;
          }
        }
        extractedValue = best;
        const tolerance = 0.05;
        isMatch = bestRel <= tolerance;
        matchConfidence = Math.max(0, Math.min(1, 1 - bestRel / 0.2)) * 0.8;
        matchAnalysis = isMatch
          ? `Matched expected value within ${(tolerance * 100).toFixed(0)}% tolerance (closest value: ${best}).`
          : `Closest value differs from expected by ${(bestRel * 100).toFixed(1)}% (closest value: ${best}).`;
      } else if (numbers.length > 0) {
        extractedValue = numbers[0];
        matchConfidence = 0.4;
      }

      return new Response(
        JSON.stringify({
          success: true,
          ocr_result: {
            document_id,
            file_name: document.file_name,
            extracted_value: extractedValue,
            extracted_unit: expectedUnit ?? null,
            document_type: 'other',
            ocr_confidence: 0.7,
            relevant_text: text.slice(0, 400),
            expected_value: expectedValue,
            is_match: isMatch,
            match_confidence: matchConfidence,
            match_analysis: matchAnalysis,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'OCR is not configured for this file type. Upload a PDF with embedded text for free extraction, or configure OCR_SERVICE_URL for full OCR.',
        extracted_value: null,
        match_confidence: 0,
        is_match: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Calculate match score
    let isMatch = false;
    let matchConfidence = 0;

    if (ocrResult.extracted_value !== null && expected_value !== undefined) {
      const tolerance = 0.05; // 5% tolerance
      const diff = Math.abs(ocrResult.extracted_value - expected_value) / expected_value;
      isMatch = diff <= tolerance;
      matchConfidence = isMatch ? ocrResult.confidence : Math.max(0, ocrResult.confidence - diff);
    }

    console.log(`OCR complete for ${document.file_name}: extracted=${ocrResult.extracted_value}, match=${isMatch}`);

    return new Response(
      JSON.stringify({
        success: true,
        ocr_result: {
          document_id,
          file_name: document.file_name,
          extracted_value: ocrResult.extracted_value,
          extracted_unit: ocrResult.extracted_unit,
          document_type: ocrResult.document_type,
          ocr_confidence: ocrResult.confidence,
          relevant_text: ocrResult.relevant_text,
          expected_value,
          is_match: isMatch,
          match_confidence: matchConfidence,
          match_analysis: ocrResult.match_analysis,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OCR processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * scanService.ts — Azure Cloud version (Supabase removed)
 *
 * Architecture change: instead of uploading images to Supabase Storage
 * and inserting into aadhaar_scans, this service encodes images as base64
 * and POSTs them directly to the n8n webhook. Images are processed
 * in-memory by Gemini OCR; only the final JSON is stored (in Azure SQL).
 *
 * The aadhaar_scans table and Supabase Storage bucket are eliminated.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScanRecord {
  id: string;        // batch_id (uuid) shared across front+back
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface QueueRecord {
  id: string;
  user_id: string;
  batch_id: string | null;
  patient_data: Record<string, any>;
  confidence_score: number;
  status: 'ready' | 'consumed';
  created_at: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678';
const AZURE_FUNCTION_URL = import.meta.env.VITE_AZURE_FUNCTION_URL || '';
const AZURE_FUNCTION_KEY = import.meta.env.VITE_AZURE_FUNCTION_KEY || '';

// ─── Auth (simplified — no Supabase GoTrue) ───────────────────────────────────

/**
 * Login is now just setting the employee ID locally.
 * No server authentication required — the employee ID is scoped per hospital.
 */
export async function login(
  employeeId: string,
  _password?: string   // kept for interface compatibility during transition
): Promise<{ user_id: string } | null> {
  if (!employeeId || employeeId.trim() === '') return null;
  return { user_id: employeeId.trim() };
}

export async function logout(): Promise<void> {
  // Nothing to do — no server session to invalidate
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URL prefix — n8n expects raw base64
      resolve(result.replace(/^data:[^;]+;base64,/, ''));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Submit Scan (replaces: uploadImage + uploadPDF + createScan + webhook) ───

/**
 * Sends the scan to n8n. Prefers the compressed PDF blob (from background
 * processing). Falls back to raw JPEG base64 if no blob is available.
 */
export async function submitScan(scan: {
  user_id: string;
  front_image: string;     // base64 data URL (fallback)
  back_image: string | null;
  processed_pdf?: Blob | null;  // compressed greyscale PDF from imageProcessor
}): Promise<ScanRecord> {
  const batchId = crypto.randomUUID();

  let body: Record<string, any>;

  if (scan.processed_pdf) {
    // Preferred path: send single compressed PDF
    const pdfBase64 = await blobToBase64(scan.processed_pdf);
    console.log(`[scanService] Sending PDF: ${(scan.processed_pdf.size / 1024).toFixed(0)}KB`);
    body = {
      user_id: scan.user_id,
      batch_id: batchId,
      pdf_data: pdfBase64,
      content_type: 'application/pdf',
    };
  } else {
    // Fallback: send raw JPEG base64 images
    console.log('[scanService] No processed PDF — falling back to raw images');
    const frontBase64 = scan.front_image.replace(/^data:[\w/]+;base64,/, '');
    const backBase64 = scan.back_image
      ? scan.back_image.replace(/^data:[\w/]+;base64,/, '')
      : null;
    body = {
      user_id: scan.user_id,
      batch_id: batchId,
      front_image: frontBase64,
      back_image: backBase64,
    };
  }

  const response = await fetch(`${N8N_WEBHOOK_URL}/webhook/aadhaar-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

    if (!response.ok) {
      // Only fail on non-2xx HTTP status.
      // n8n auto-respond mode returns 200 with last-node data — that's fine.
      const text = await response.text().catch(() => response.status.toString());
      throw new Error(`n8n webhook failed (${response.status}): ${text}`);
    }


  return {
    id: batchId,
    user_id: scan.user_id,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
}

// ─── Queue Polling (replaces: Supabase Realtime + rest polling) ───────────────

/**
 * Polls the Azure Function queue endpoint until a record with the given
 * batch_id appears with status='ready', or until timeout.
 *
 * @returns Unsubscribe function to stop polling
 */
export function pollScanProgress(
  batchId: string,
  userId: string,
  callbacks: {
    onOutputReady: (output: Record<string, any>) => void;
    onStatusComplete: () => void;
    onError?: (err: Error) => void;
  }
): () => void {
  let fired = false;
  let active = true;

  const poll = async () => {
    if (!active || fired) return;

    try {
      const headers: Record<string, string> = {};
      if (AZURE_FUNCTION_KEY) {
        headers['x-functions-key'] = AZURE_FUNCTION_KEY;
      }

      const res = await fetch(
        `${AZURE_FUNCTION_URL}/queue/${encodeURIComponent(userId)}?include_consumed=true`,
        { headers }
      );

      if (!res.ok) throw new Error(`Poll failed: ${res.status}`);

      const records: QueueRecord[] = await res.json();

      // Match by batch_id regardless of status (extension may have consumed it already)
      // A record existing AT ALL means OCR completed successfully
      const match = batchId
        ? records.find(r => r.batch_id === batchId)
          || records.find(r => r.status === 'ready' || r.status === 'consumed')
        : records.find(r => r.status === 'ready' || r.status === 'consumed');

      if (match && !fired) {
        fired = true;
        const patientData = typeof match.patient_data === 'string'
          ? JSON.parse(match.patient_data)
          : match.patient_data;

        // Step 2 → completed: "Extracting Details"
        callbacks.onOutputReady(patientData);

        // Brief pause so the user sees the intermediate step before "Transfer Complete"
        setTimeout(() => {
          callbacks.onStatusComplete();
        }, 700);
      }
    } catch (err) {
      callbacks.onError?.(err as Error);
    }
  };

  const interval = setInterval(poll, 1000);
  poll(); // Immediate first poll

  return () => {
    active = false;
    clearInterval(interval);
  };
}

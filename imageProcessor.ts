/**
 * imageProcessor.ts — In-memory image processing pipeline
 *
 * Greyscale → PDF → Compress
 *
 * Runs entirely client-side during the 5-second countdown.
 * Produces a single compressed PDF blob for upload.
 */
import { jsPDF } from 'jspdf';

// ─── Greyscale ──────────────────────────────────────────────────────────────

/**
 * Convert a base64 data URL image to greyscale using an offscreen canvas.
 * Returns a new base64 data URL (JPEG, quality 0.92 for OCR clarity).
 */
function toGreyscale(base64DataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Luminance formula: 0.299R + 0.587G + 0.114B
      for (let i = 0; i < data.length; i += 4) {
        const grey = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = grey;     // R
        data[i + 1] = grey; // G
        data[i + 2] = grey; // B
        // Alpha (data[i+3]) unchanged
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.80));
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = base64DataUrl;
  });
}

// ─── Load image dimensions ──────────────────────────────────────────────────

function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = base64;
  });
}

// ─── PDF Creation ───────────────────────────────────────────────────────────

/**
 * Create a PDF from one or more greyscale base64 images.
 * Each image becomes a full-bleed page sized exactly to image dimensions.
 * Uses JPEG compression built into jsPDF.
 */
async function createPDF(greyscaleImages: string[]): Promise<ArrayBuffer> {
  const DPI = 120;
  let doc: jsPDF | undefined;

  for (let i = 0; i < greyscaleImages.length; i++) {
    const img = await loadImage(greyscaleImages[i]);
    const widthMM = (img.width / DPI) * 25.4;
    const heightMM = (img.height / DPI) * 25.4;
    const orientation = widthMM > heightMM ? 'landscape' : 'portrait';

    if (i === 0) {
      doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: [widthMM, heightMM],
        compress: true,
      });
    } else {
      doc!.addPage([widthMM, heightMM], orientation);
    }

    const imgData = greyscaleImages[i].replace(/^data:image\/\w+;base64,/, '');
    doc!.addImage(imgData, 'JPEG', 0, 0, widthMM, heightMM, undefined, 'FAST');
  }

  if (!doc) throw new Error('No images to process');

  return doc.output('arraybuffer') as ArrayBuffer;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Full processing pipeline: greyscale all images → create PDF → return as Blob.
 *
 * @param images   - base64 data URL strings (1 for long, 2 for short Aadhaar)
 * @returns        - compressed PDF Blob ready for upload
 */
export async function processForUpload(images: string[]): Promise<Blob> {
  const t0 = performance.now();

  // Step 1: Convert all images to greyscale in parallel
  const greyscaleImages = await Promise.all(images.map(toGreyscale));
  console.log(`[Processor] Greyscale: ${(performance.now() - t0).toFixed(0)}ms`);

  // Step 2: Create compressed PDF from greyscale images
  const pdfBuffer = await createPDF(greyscaleImages);
  console.log(`[Processor] PDF created: ${(pdfBuffer.byteLength / 1024).toFixed(0)}KB in ${(performance.now() - t0).toFixed(0)}ms`);

  // Step 3: Return as Blob
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  console.log(`[Processor] Total: ${(performance.now() - t0).toFixed(0)}ms, final size: ${(blob.size / 1024).toFixed(0)}KB`);

  return blob;
}

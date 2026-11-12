/** Browser-only helpers for files people upload. */

/** Crop to a centred square and re-encode as a JPEG before upload (smaller, consistent avatars). */
export async function cropPhoto(file: File, size = 480): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const m = Math.min(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), "image/jpeg", 0.88));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Rough page count for a PDF, read from its structure (good enough for "4 pages"). */
export async function countPdfPages(file: File): Promise<number | null> {
  try {
    const text = new TextDecoder("latin1").decode(await file.arrayBuffer());
    const n = (text.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function formatBytes(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

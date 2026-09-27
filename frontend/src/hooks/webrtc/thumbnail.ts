/**
 * Helper to generate small image thumbnail data URLs for pre-transmission metadata.
 */
export function generateThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(undefined); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 120;
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; } }
        else        { if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL('image/jpeg', 0.6)); }
        else resolve(undefined);
      };
      img.onerror = () => resolve(undefined);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

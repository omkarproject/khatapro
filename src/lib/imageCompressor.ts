/**
 * Universal high-performance client-side image compression.
 * Automatically resizes images to max 1200x1200 maintaining aspect ratio,
 * converts to JPEG quality 0.75 (< 80-100KB), and handles fallback gracefully.
 * Protects Supabase DB & Storage transfer quotas while keeping low-end devices super-fast.
 */

export async function compressImage(
  fileOrDataUrl: File | Blob | string,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.75
): Promise<{ dataUrl: string; size: number }> {
  if (typeof window === 'undefined') {
    if (typeof fileOrDataUrl === 'string') {
      return { dataUrl: fileOrDataUrl, size: fileOrDataUrl.length };
    }
    return { dataUrl: '', size: 0 };
  }

  return new Promise((resolve) => {
    const processImageSource = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down proportionally if larger than maximum bounds
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ dataUrl: src, size: src.length });
            return;
          }

          // Fill white background (useful for transparent PNGs converted to JPEG)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Initial compression
          let compressedUrl = canvas.toDataURL('image/jpeg', quality);

          // If still larger than 120KB, progressively drop quality
          if (compressedUrl.length > 160000 && quality > 0.5) {
            compressedUrl = canvas.toDataURL('image/jpeg', 0.55);
          }

          resolve({
            dataUrl: compressedUrl,
            size: Math.round((compressedUrl.length * 3) / 4), // Approximate bytes from base64
          });
        } catch (e) {
          console.warn('Canvas compression fallback:', e);
          resolve({ dataUrl: src, size: src.length });
        }
      };

      img.onerror = () => {
        resolve({ dataUrl: src, size: src.length });
      };

      img.src = src;
    };

    if (typeof fileOrDataUrl === 'string') {
      processImageSource(fileOrDataUrl);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = (e.target?.result as string) || '';
        if (result) {
          processImageSource(result);
        } else {
          resolve({ dataUrl: '', size: 0 });
        }
      };
      reader.onerror = () => resolve({ dataUrl: '', size: 0 });
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

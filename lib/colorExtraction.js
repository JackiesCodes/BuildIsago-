'use client';

// Real pixel-based dominant-color extraction — not AI. Downsamples the
// image onto an offscreen canvas, quantizes pixel colors into buckets,
// and returns the most frequent buckets far enough apart to look like
// distinct swatches rather than near-duplicates.

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

export function extractDominantColors(img, count = 6) {
  const maxDim = 140;
  const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  let data;
  try {
    data = ctx.getImageData(0, 0, width, height).data;
  } catch {
    throw new Error('CANVAS_TAINTED');
  }

  const step = 24;
  const buckets = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 128) continue;
    const r = Math.round(data[i] / step) * step;
    const g = Math.round(data[i + 1] / step) * step;
    const b = Math.round(data[i + 2] / step) * step;
    const key = `${r},${g},${b}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);

  const chosen = [];
  const minDistance = 40;
  for (const [key] of sorted) {
    const [r, g, b] = key.split(',').map(Number);
    const tooClose = chosen.some((c) => {
      const dr = c.r - r;
      const dg = c.g - g;
      const db = c.b - b;
      return Math.sqrt(dr * dr + dg * dg + db * db) < minDistance;
    });
    if (!tooClose) chosen.push({ r, g, b });
    if (chosen.length >= count) break;
  }

  return chosen.map(({ r, g, b }) => rgbToHex(r, g, b));
}

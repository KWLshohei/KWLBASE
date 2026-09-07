const DEFAULT_SRC = "/kwl-logo.png";
const DEFAULT_COLOR = "#F6F1E7";

let cache: Promise<HTMLCanvasElement | null> | null = null;

/**
 * ロゴは白地に黒線の PNG。そのままでは暗いカードに置けないので、
 * 線の濃さを不透明度に読み替えて任意の色に置き換え、余白を切り落とす。
 * 変換結果は使い回すため一度だけ実行する。
 */
export function loadLogoMark(): Promise<HTMLCanvasElement | null> {
  cache ??= toMark(DEFAULT_SRC, DEFAULT_COLOR);
  return cache;
}

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function toMark(src: string, color: string): Promise<HTMLCanvasElement | null> {
  const image = new Image();
  image.src = src;
  try {
    await image.decode();
  } catch {
    return null;
  }

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  if (!sourceCtx) return null;
  sourceCtx.drawImage(image, 0, 0);

  const bitmap = sourceCtx.getImageData(0, 0, width, height);
  const pixels = bitmap.data;
  const [r, g, b] = channels(color);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = 255 - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = alpha;

    if (alpha > 24) {
      const index = i / 4;
      const x = index % width;
      const y = (index / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null;
  sourceCtx.putImageData(bitmap, 0, 0);

  const mark = document.createElement("canvas");
  mark.width = maxX - minX + 1;
  mark.height = maxY - minY + 1;
  mark.getContext("2d")?.drawImage(source, minX, minY, mark.width, mark.height, 0, 0, mark.width, mark.height);
  return mark;
}

import type { AssetRef } from "@geekdesign/design-schema";

export interface AssetItem {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  thumbnail_url: string;
  created_at: string;
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export const absoluteAssetUrl = (url: string): string =>
  url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")
    ? url
    : `${API_URL}${url}`;

const allowedImageTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export async function localAssetFromFile(file: File): Promise<AssetItem> {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Choose a PNG, JPEG, WebP, or SVG image.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Local images must be 10 MB or smaller.");
  }
  const dataUrl = await readDataUrl(file);
  return {
    id: `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    filename: file.name || "Local image",
    mime_type: file.type,
    size_bytes: file.size,
    url: dataUrl,
    thumbnail_url: dataUrl,
    created_at: new Date().toISOString(),
  };
}

const readDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read the image."));
    reader.readAsDataURL(file);
  });

export const toAssetRef = (asset: AssetItem): AssetRef => ({
  id: asset.id,
  type: asset.mime_type === "image/svg+xml" ? "svg" : "image",
  uri: absoluteAssetUrl(asset.url),
  mimeType: asset.mime_type,
  metadata: {
    filename: asset.filename,
    thumbnailUrl: absoluteAssetUrl(asset.thumbnail_url),
  },
});

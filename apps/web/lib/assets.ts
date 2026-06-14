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
  url.startsWith("http") ? url : `${API_URL}${url}`;

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

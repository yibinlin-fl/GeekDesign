import type { AssetRef } from "@geekdesign/design-schema";
import type { ImageCache } from "@geekdesign/renderer-core";

export class BrowserImageCache implements ImageCache {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly pending = new Map<string, Promise<CanvasImageSource>>();

  constructor(private readonly onLoad: () => void) {}

  get(assetId: string): CanvasImageSource | undefined {
    return this.images.get(assetId);
  }

  isIdle(): boolean {
    return this.pending.size === 0;
  }

  load(asset: AssetRef): Promise<CanvasImageSource> {
    const cached = this.images.get(asset.id);
    if (cached) return Promise.resolve(cached);
    const pending = this.pending.get(asset.id);
    if (pending) return pending;

    const promise = new Promise<CanvasImageSource>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        this.images.set(asset.id, image);
        this.pending.delete(asset.id);
        this.onLoad();
        resolve(image);
      };
      image.onerror = () => {
        this.pending.delete(asset.id);
        reject(new Error(`Unable to load asset "${asset.id}"`));
      };
      image.src = asset.uri;
    });
    this.pending.set(asset.id, promise);
    return promise;
  }
}

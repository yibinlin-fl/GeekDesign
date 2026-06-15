import { describe, expect, it } from "vitest";

import { useEditorStore } from "./editor-store";

describe("asset insertion", () => {
  it("registers an asset and creates an image node", () => {
    const store = useEditorStore.getState();
    store.newDesign();

    store.insertAsset({
      id: "asset_test",
      filename: "photo.png",
      mime_type: "image/png",
      size_bytes: 128,
      url: "/uploads/user/photo.png",
      thumbnail_url: "/uploads/user/photo_thumb.webp",
      created_at: "2026-06-14T00:00:00.000Z",
    });

    const document = useEditorStore.getState().document;
    const image = Object.values(document.nodes).find(
      (node) => node.type === "image",
    );
    expect(document.assets.asset_test?.mimeType).toBe("image/png");
    expect(image?.type === "image" && image.image.assetId).toBe("asset_test");
  });

  it("replaces the selected image through commands", () => {
    const store = useEditorStore.getState();
    store.newDesign();
    store.insertAsset(assetItem("asset_first", "first.png"));

    useEditorStore
      .getState()
      .insertAsset(assetItem("asset_second", "second.png"), true);

    const state = useEditorStore.getState();
    const selected = state.selectedNodeId
      ? state.document.nodes[state.selectedNodeId]
      : undefined;
    expect(selected?.type === "image" && selected.image.assetId).toBe(
      "asset_second",
    );
    expect(state.canUndo).toBe(true);
  });
});

describe("editor transforms", () => {
  it("updates, duplicates, and deletes selected nodes through commands", () => {
    const store = useEditorStore.getState();
    store.newDesign();
    store.addRect();

    useEditorStore
      .getState()
      .updateSelectedTransform({ x: 42, width: 360, rotation: 15 });
    let state = useEditorStore.getState();
    const selected = state.selectedNodeId
      ? state.document.nodes[state.selectedNodeId]
      : undefined;
    expect(selected?.transform).toMatchObject({
      x: 42,
      width: 360,
      rotation: 15,
    });

    state.duplicateSelected();
    state = useEditorStore.getState();
    expect(Object.keys(state.document.nodes)).toHaveLength(2);
    expect(state.canUndo).toBe(true);

    state.deleteSelected();
    state = useEditorStore.getState();
    expect(Object.keys(state.document.nodes)).toHaveLength(1);
    expect(state.selectedNodeId).toBeUndefined();

    state.undo();
    expect(Object.keys(useEditorStore.getState().document.nodes)).toHaveLength(
      2,
    );
  });
});

const assetItem = (id: string, filename: string) => ({
  id,
  filename,
  mime_type: "image/png",
  size_bytes: 128,
  url: `/uploads/user/${filename}`,
  thumbnail_url: `/uploads/user/${filename}_thumb.webp`,
  created_at: "2026-06-14T00:00:00.000Z",
});

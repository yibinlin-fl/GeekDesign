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

describe("element library", () => {
  it("creates ellipse, line, and frame nodes through commands", () => {
    const store = useEditorStore.getState();
    store.newDesign();
    store.addEllipse();
    useEditorStore.getState().addLine();
    useEditorStore.getState().addFrame();

    const nodes = Object.values(useEditorStore.getState().document.nodes);
    expect(nodes.map((node) => node.type)).toEqual([
      "ellipse",
      "line",
      "frame",
    ]);
    expect(useEditorStore.getState().document.pages[0]?.children[0]).toBe(
      nodes.find((node) => node.type === "frame")?.id,
    );
    expect(
      nodes.find((node) => node.type === "line")?.style.stroke?.width,
    ).toBe(4);
  });

  it("updates appearance and image fit through commands", () => {
    const store = useEditorStore.getState();
    store.newDesign();
    store.addRect();
    useEditorStore.getState().updateStroke("#112233", 6);
    useEditorStore.getState().updateOpacity(0.5);
    useEditorStore.getState().updateCornerRadius(28);

    let state = useEditorStore.getState();
    let selected = state.selectedNodeId
      ? state.document.nodes[state.selectedNodeId]
      : undefined;
    expect(selected?.style.opacity).toBe(0.5);
    expect(selected?.style.stroke?.width).toBe(6);
    expect(selected?.type === "rect" && selected.cornerRadius).toBe(28);

    state.insertAsset(assetItem("fit_asset", "fit.png"));
    useEditorStore.getState().updateImageFit("contain");
    state = useEditorStore.getState();
    selected = state.selectedNodeId
      ? state.document.nodes[state.selectedNodeId]
      : undefined;
    expect(selected?.type === "image" && selected.image.fit).toBe("contain");
  });
});

describe("typography", () => {
  it("updates text typography through one controlled command", () => {
    const store = useEditorStore.getState();
    store.newDesign();
    store.addText();
    useEditorStore.getState().updateTextStyle({
      fontFamily: "Georgia",
      fontWeight: 700,
      textAlign: "center",
      lineHeight: 1.5,
      letterSpacing: 2,
    });

    const state = useEditorStore.getState();
    const selected = state.selectedNodeId
      ? state.document.nodes[state.selectedNodeId]
      : undefined;
    expect(selected?.type === "text" && selected.text).toMatchObject({
      fontFamily: "Georgia",
      fontWeight: 700,
      textAlign: "center",
      lineHeight: 1.5,
      letterSpacing: 2,
    });

    state.undo();
    const undone = useEditorStore.getState();
    const undoneNode = undone.selectedNodeId
      ? undone.document.nodes[undone.selectedNodeId]
      : undefined;
    expect(undoneNode?.type === "text" && undoneNode.text.fontFamily).toBe(
      "Arial",
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

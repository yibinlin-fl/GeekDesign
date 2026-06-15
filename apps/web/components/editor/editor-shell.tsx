"use client";

import type { Node, Page } from "@geekdesign/design-schema";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { apiFetch, getAccessToken } from "../../lib/auth";
import { getSelectedNode, useEditorStore } from "../../lib/editor-store";
import { Icon, type IconName } from "../ui/icon";
import { AssetPanel } from "./asset-panel";
import { CanvasWorkspace } from "./canvas-workspace";
import { ExportControls } from "./export-controls";

type ToolPanel = "design" | "elements" | "text" | "uploads" | "layers" | "ai";

export function EditorShell() {
  const store = useEditorStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const [cloudStatus, setCloudStatus] = useState("Local design");
  const [activePanel, setActivePanel] = useState<ToolPanel>("elements");
  const [aiOpen, setAiOpen] = useState(false);
  const loadedProject = useRef<string>();
  const selected = getSelectedNode(store.document, store.selectedNodeId);
  const currentPage =
    store.document.pages.find((page) => page.id === store.currentPageId) ??
    store.document.pages[0]!;

  useEffect(() => {
    if (!projectId) {
      store.load();
      return;
    }
    if (loadedProject.current === projectId) return;
    loadedProject.current = projectId;
    setCloudStatus("Loading cloud project...");
    void apiFetch<{ document_json: typeof store.document }>(
      `/projects/${projectId}`,
    )
      .then((project) => {
        store.loadDocument(project.document_json);
        setCloudStatus("Saved to cloud");
      })
      .catch((error: unknown) => {
        loadedProject.current = undefined;
        setCloudStatus(
          error instanceof Error ? error.message : "Cloud load failed",
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (
      !projectId ||
      !loadedProject.current ||
      store.saved ||
      !getAccessToken()
    )
      return;
    setCloudStatus("Autosaving...");
    const timeout = window.setTimeout(() => {
      void apiFetch(`/projects/${projectId}/autosave`, {
        method: "POST",
        body: JSON.stringify({ document_json: store.document }),
      })
        .then(() => {
          store.markSaved();
          setCloudStatus("Saved to cloud");
        })
        .catch((error: unknown) =>
          setCloudStatus(
            error instanceof Error ? error.message : "Autosave failed",
          ),
        );
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [projectId, store, store.document, store.saved]);

  const saveCloud = async () => {
    if (projectId) {
      await apiFetch(`/projects/${projectId}/autosave`, {
        method: "POST",
        body: JSON.stringify({ document_json: store.document }),
      });
      store.markSaved();
      setCloudStatus("Saved to cloud");
      return;
    }
    const project = await apiFetch<{ id: string }>("/projects", {
      method: "POST",
      body: JSON.stringify({
        title: store.document.title,
        document_json: store.document,
      }),
    });
    router.replace(`/editor?projectId=${project.id}`);
  };

  return (
    <main className="flex h-screen min-w-[1180px] flex-col overflow-hidden bg-[#ececf0]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-800 bg-[#24232a] px-3 text-white">
        <Link className="mr-2 flex items-center gap-2" href="/">
          <span className="brand-gradient grid size-8 place-items-center rounded-lg text-xs font-black">
            G
          </span>
          <span className="text-sm font-black">GeekDesign</span>
        </Link>
        <div className="mx-1 h-5 w-px bg-white/15" />
        <button
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          onClick={store.newDesign}
        >
          New design
        </button>
        <div className="mx-1 h-5 w-px bg-white/15" />
        <button
          className="grid size-8 place-items-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white disabled:opacity-25"
          onClick={store.undo}
          disabled={!store.canUndo}
          aria-label="Undo"
          title="Undo"
        >
          <Icon className="size-4" name="undo" />
        </button>
        <button
          className="grid size-8 place-items-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white disabled:opacity-25"
          onClick={store.redo}
          disabled={!store.canRedo}
          aria-label="Redo"
          title="Redo"
        >
          <Icon className="size-4" name="redo" />
        </button>
        <div className="ml-3 min-w-0">
          <p className="max-w-56 truncate text-xs font-bold">
            {store.document.title}
          </p>
          <p className="text-[10px] text-white/40">
            {projectId
              ? cloudStatus
              : store.saved
                ? "Saved locally"
                : "Unsaved changes"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 transition hover:bg-white/15 hover:text-white"
            onClick={store.save}
          >
            Save
          </button>
          <button
            className="hidden rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 transition hover:bg-white/15 hover:text-white xl:block"
            onClick={store.load}
          >
            Load
          </button>
          <button
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 transition hover:bg-white/15 hover:text-white"
            onClick={() => void saveCloud()}
          >
            Save to cloud
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-bold shadow-lg shadow-violet-950/30"
            onClick={() => setAiOpen((open) => !open)}
          >
            <Icon className="size-3.5" name="ai" />
            Ask AI
          </button>
          <ExportControls />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[68px_278px_minmax(0,1fr)_294px]">
        <aside className="flex flex-col items-center border-r border-zinc-800 bg-[#292830] py-3 text-white">
          <ToolButton
            icon="grid"
            label="Design"
            active={activePanel === "design"}
            onClick={() => setActivePanel("design")}
          />
          <ToolButton
            icon="elements"
            label="Elements"
            active={activePanel === "elements"}
            onClick={() => setActivePanel("elements")}
          />
          <ToolButton
            icon="text"
            label="Text"
            active={activePanel === "text"}
            onClick={() => setActivePanel("text")}
          />
          <ToolButton
            icon="upload"
            label="Uploads"
            active={activePanel === "uploads"}
            onClick={() => setActivePanel("uploads")}
          />
          <ToolButton
            icon="layers"
            label="Layers"
            active={activePanel === "layers"}
            onClick={() => setActivePanel("layers")}
          />
          <ToolButton
            icon="ai"
            label="AI"
            active={activePanel === "ai"}
            onClick={() => setAiOpen(true)}
          />
          <div className="mt-auto">
            <ToolButton
              icon="home"
              label="Projects"
              onClick={() => router.push("/projects")}
            />
          </div>
        </aside>

        <aside className="overflow-y-auto border-r border-zinc-200 bg-white p-4">
          <PanelContent panel={activePanel} onPanelChange={setActivePanel} />
        </aside>

        <section className="relative min-w-0 overflow-hidden bg-[#ececf0]">
          <CanvasWorkspace />
          {aiOpen ? <AiPanel onClose={() => setAiOpen(false)} /> : null}
        </section>

        <aside className="overflow-y-auto border-l border-zinc-200 bg-white">
          <div className="flex h-12 items-center border-b border-zinc-200 px-4">
            <h2 className="text-sm font-black">Properties</h2>
            <button
              className="ml-auto grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100"
              aria-label="Inspector settings"
            >
              <Icon className="size-4" name="settings" />
            </button>
          </div>
          <Inspector node={selected} page={currentPage} />
        </aside>
      </div>

      <footer className="flex h-7 shrink-0 items-center border-t border-zinc-300 bg-white px-3 text-[10px] font-semibold text-zinc-500">
        <span>
          {store.document.canvas.width} x {store.document.canvas.height}px
        </span>
        <span className="ml-4">
          {Object.keys(store.document.nodes).length} elements
        </span>
        <span className="ml-4">{store.document.pages.length} pages</span>
        <span className="ml-auto">{Math.round(store.zoom * 100)}%</span>
        <span className="mx-3 h-3 w-px bg-zinc-300" />
        <span>Canvas 2D renderer</span>
      </footer>
    </main>
  );
}

function ToolButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`mb-1 flex w-14 flex-col items-center gap-1 rounded-xl py-2 text-[9px] font-semibold transition ${active ? "bg-violet-500 text-white" : "text-white/45 hover:bg-white/10 hover:text-white"}`}
      onClick={onClick}
      aria-label={label}
    >
      <Icon className="size-4" name={icon} />
      {label}
    </button>
  );
}

function PanelContent({
  panel,
  onPanelChange,
}: {
  panel: ToolPanel;
  onPanelChange: (panel: ToolPanel) => void;
}) {
  const store = useEditorStore();
  const currentPage =
    store.document.pages.find((page) => page.id === store.currentPageId) ??
    store.document.pages[0]!;
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">
            Create
          </p>
          <h2 className="mt-0.5 text-lg font-black capitalize">{panel}</h2>
        </div>
        <button
          className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100"
          aria-label="Panel menu"
        >
          <Icon className="size-4" name="menu" />
        </button>
      </div>
      <div className="relative mt-4">
        <Icon
          className="absolute left-3 top-2.5 size-4 text-zinc-400"
          name="search"
        />
        <input
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-violet-300 focus:bg-white"
          placeholder={`Search ${panel}`}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <AddCard
          label="Add text"
          copy="Headline"
          icon="text"
          tone="from-violet-500 to-purple-600"
          onClick={store.addText}
        />
        <AddCard
          label="Add rectangle"
          copy="Shape"
          icon="elements"
          tone="from-fuchsia-500 to-rose-500"
          onClick={store.addRect}
        />
      </div>
      <button
        className="mt-2 flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50"
        onClick={store.addImagePlaceholder}
      >
        <span className="grid size-9 place-items-center rounded-xl bg-zinc-800 text-white">
          <Icon className="size-4" name="image" />
        </span>
        <span>
          <strong className="block text-xs">Add image placeholder</strong>
          <span className="text-[10px] text-zinc-400">
            Prepare a visual frame
          </span>
        </span>
      </button>

      <div className="mt-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Shapes & containers
        </h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ShapeButton
            label="Add ellipse"
            symbol="○"
            onClick={store.addEllipse}
          />
          <ShapeButton label="Add line" symbol="╱" onClick={store.addLine} />
          <ShapeButton label="Add frame" symbol="▣" onClick={store.addFrame} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Layers
        </h3>
        <button
          className="text-[10px] font-bold text-violet-600"
          onClick={() => onPanelChange("layers")}
        >
          View all
        </button>
      </div>
      <div className="mt-2 space-y-1" data-testid="layers-list">
        {[...currentPage.children].reverse().map((nodeId) => {
          const node = store.document.nodes[nodeId]!;
          return (
            <button
              key={node.id}
              className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition ${store.selectedNodeId === node.id ? "border-violet-200 bg-violet-50 text-violet-800" : "border-transparent hover:bg-zinc-50"}`}
              onClick={() => store.selectNode(node.id)}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500">
                <Icon
                  className="size-3.5"
                  name={
                    node.type === "text"
                      ? "text"
                      : node.type === "image"
                        ? "image"
                        : "elements"
                  }
                />
              </span>
              <span className="truncate font-semibold">{layerName(node)}</span>
              <span className="ml-auto text-[9px] uppercase text-zinc-400">
                {node.type}
              </span>
            </button>
          );
        })}
        {currentPage.children.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-[11px] leading-5 text-zinc-400">
            Add an element to begin your design.
          </p>
        ) : null}
      </div>
      <AssetPanel />
    </>
  );
}

function AddCard({
  label,
  copy,
  icon,
  tone,
  onClick,
}: {
  label: string;
  copy: string;
  icon: IconName;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`group rounded-xl bg-gradient-to-br ${tone} p-3 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg`}
      onClick={onClick}
    >
      <Icon className="size-5" name={icon} />
      <strong className="mt-4 block text-xs">{label}</strong>
      <span className="text-[10px] text-white/60">{copy}</span>
    </button>
  );
}

function ShapeButton({
  label,
  symbol,
  onClick,
}: {
  label: string;
  symbol: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-center transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
      onClick={onClick}
      aria-label={label}
    >
      <span className="block text-2xl leading-7">{symbol}</span>
      <span className="mt-1 block text-[9px] font-bold">
        {label.replace("Add ", "")}
      </span>
    </button>
  );
}

function Inspector({ node, page }: { node?: Node; page: Page }) {
  const updateText = useEditorStore((state) => state.updateText);
  const updateFontSize = useEditorStore((state) => state.updateFontSize);
  const updateTextStyle = useEditorStore((state) => state.updateTextStyle);
  const updateFillColor = useEditorStore((state) => state.updateFillColor);
  const updateStroke = useEditorStore((state) => state.updateStroke);
  const updateOpacity = useEditorStore((state) => state.updateOpacity);
  const updateCornerRadius = useEditorStore(
    (state) => state.updateCornerRadius,
  );
  const updateImageFit = useEditorStore((state) => state.updateImageFit);
  const updateShadow = useEditorStore((state) => state.updateShadow);
  const updateLocked = useEditorStore((state) => state.updateLocked);
  const updateVisible = useEditorStore((state) => state.updateVisible);
  const updateSelectedTransform = useEditorStore(
    (state) => state.updateSelectedTransform,
  );
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const updatePageBackground = useEditorStore(
    (state) => state.updatePageBackground,
  );

  if (!node) {
    const background =
      page.background.type === "solid" ? page.background.color : "#ffffff";
    return (
      <div>
        <InspectorSection title="Page">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Icon className="size-4" name="file" />
            </span>
            <div>
              <p className="text-sm font-bold">{page.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                Page background
              </p>
            </div>
          </div>
        </InspectorSection>
        <InspectorSection title="Appearance">
          <ColorField
            label="Page background"
            value={background}
            onChange={(color) => updatePageBackground({ type: "solid", color })}
          />
        </InspectorSection>
        <div className="p-5 text-center">
          <p className="text-xs leading-5 text-zinc-400">
            Select an element on the canvas or in the layers panel to edit it.
          </p>
        </div>
      </div>
    );
  }
  const fillColor =
    node.style.fill?.type === "solid" ? node.style.fill.color : "#7c3aed";
  const strokeColor =
    node.style.stroke?.paint.type === "solid"
      ? node.style.stroke.paint.color
      : "#27272a";
  const strokeWidth = node.style.stroke?.width ?? 0;

  return (
    <div>
      <InspectorSection title="Selection">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <Icon
              className="size-4"
              name={
                node.type === "text"
                  ? "text"
                  : node.type === "image"
                    ? "image"
                    : "elements"
              }
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{layerName(node)}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">
              {node.type} element
            </p>
          </div>
        </div>
      </InspectorSection>
      {node.type === "text" ? (
        <InspectorSection title="Typography">
          <label className="block text-[11px] font-bold text-zinc-500">
            Text content
            <textarea
              className="mt-2 min-h-20 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-normal outline-none focus:border-violet-300 focus:bg-white"
              value={node.text.content}
              onChange={(event) => updateText(event.target.value)}
              aria-label="Text content"
            />
          </label>
          <label className="mt-3 block text-[11px] font-bold text-zinc-500">
            Font size
            <input
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-normal outline-none focus:border-violet-300 focus:bg-white"
              type="number"
              min="1"
              value={node.text.fontSize}
              onChange={(event) => updateFontSize(Number(event.target.value))}
              aria-label="Font size"
            />
          </label>
          <label className="mt-3 block text-[11px] font-bold text-zinc-500">
            Font family
            <select
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 outline-none"
              value={node.text.fontFamily}
              onChange={(event) =>
                updateTextStyle({ fontFamily: event.target.value })
              }
              aria-label="Font family"
            >
              {[
                "Arial",
                "Inter",
                "Georgia",
                "Times New Roman",
                "Courier New",
              ].map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <TransformField
              label="Line height"
              value={node.text.lineHeight}
              min={0.5}
              step={0.1}
              onChange={(lineHeight) => updateTextStyle({ lineHeight })}
            />
            <TransformField
              label="Letter spacing"
              value={node.text.letterSpacing}
              step={0.5}
              onChange={(letterSpacing) => updateTextStyle({ letterSpacing })}
            />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {(["left", "center", "right", "justify"] as const).map(
              (textAlign) => (
                <button
                  key={textAlign}
                  className={`rounded-lg border px-1 py-2 text-[10px] font-bold ${
                    node.text.textAlign === textAlign
                      ? "border-violet-300 bg-violet-50 text-violet-700"
                      : "border-zinc-200 text-zinc-500"
                  }`}
                  onClick={() => updateTextStyle({ textAlign })}
                  aria-label={`Inspector align ${textAlign}`}
                >
                  {textAlign}
                </button>
              ),
            )}
          </div>
        </InspectorSection>
      ) : null}
      <InspectorSection title="Appearance">
        {node.type !== "line" && node.type !== "image" ? (
          <ColorField
            label="Fill color"
            value={fillColor}
            onChange={updateFillColor}
          />
        ) : null}
        <div className="mt-3 grid grid-cols-[1fr_86px] gap-2">
          <ColorField
            label="Stroke"
            value={strokeColor}
            onChange={(color) => updateStroke(color, Math.max(1, strokeWidth))}
          />
          <TransformField
            label="Width"
            value={strokeWidth}
            min={0}
            onChange={(width) => updateStroke(strokeColor, width)}
          />
        </div>
        <label className="mt-4 block text-[11px] font-bold text-zinc-500">
          Opacity {Math.round(node.style.opacity * 100)}%
          <input
            className="mt-2 w-full accent-violet-600"
            type="range"
            min="5"
            max="100"
            value={Math.round(node.style.opacity * 100)}
            onChange={(event) =>
              updateOpacity(Number(event.target.value) / 100)
            }
            aria-label="Opacity"
          />
        </label>
        {node.type === "rect" ? (
          <div className="mt-3">
            <TransformField
              label="Corner radius"
              value={node.cornerRadius}
              min={0}
              onChange={updateCornerRadius}
            />
          </div>
        ) : null}
        {node.type === "image" ? (
          <label className="mt-3 block text-[11px] font-bold text-zinc-500">
            Image fit
            <select
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 outline-none"
              value={node.image.fit}
              onChange={(event) =>
                updateImageFit(
                  event.target.value as "cover" | "contain" | "stretch",
                )
              }
              aria-label="Image fit"
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="stretch">Stretch</option>
            </select>
          </label>
        ) : null}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StateToggle
            label="Shadow"
            active={Boolean(node.style.shadow && node.style.shadow.blur > 0)}
            onClick={() =>
              updateShadow(!(node.style.shadow && node.style.shadow.blur > 0))
            }
          />
          <StateToggle
            label="Locked"
            active={node.style.locked}
            onClick={() => updateLocked(!node.style.locked)}
          />
          <StateToggle
            label="Visible"
            active={node.style.visible}
            onClick={() => updateVisible(!node.style.visible)}
          />
        </div>
      </InspectorSection>
      <InspectorSection title="Position & size">
        <div className="grid grid-cols-2 gap-2">
          <TransformField
            label="X"
            value={node.transform.x}
            onChange={(x) => updateSelectedTransform({ x })}
          />
          <TransformField
            label="Y"
            value={node.transform.y}
            onChange={(y) => updateSelectedTransform({ y })}
          />
          <TransformField
            label="W"
            value={node.transform.width}
            min={12}
            onChange={(width) => updateSelectedTransform({ width })}
          />
          <TransformField
            label="H"
            value={node.transform.height}
            min={12}
            onChange={(height) => updateSelectedTransform({ height })}
          />
        </div>
        <div className="mt-2">
          <TransformField
            label="Rotation"
            value={node.transform.rotation}
            onChange={(rotation) => updateSelectedTransform({ rotation })}
          />
        </div>
      </InspectorSection>
      <InspectorSection title="Actions">
        <div className="grid grid-cols-2 gap-2">
          <button
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
            onClick={duplicateSelected}
          >
            Duplicate
          </button>
          <button
            className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
            onClick={deleteSelected}
          >
            Delete
          </button>
        </div>
      </InspectorSection>
    </div>
  );
}

function StateToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-xl border px-2 py-2 text-[10px] font-bold transition ${
        active
          ? "border-violet-300 bg-violet-50 text-violet-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-400"
      }`}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between text-xs font-bold text-zinc-600">
      {label}
      <span className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 pr-2 text-[10px] font-semibold uppercase text-zinc-500">
        <input
          className="size-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
      </span>
    </label>
  );
}

function TransformField({
  label,
  value,
  min,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-bold text-zinc-400 focus-within:border-violet-300 focus-within:bg-white">
      {label}
      <input
        className="mt-1 w-full bg-transparent text-sm font-bold text-zinc-700 outline-none"
        type="number"
        min={min}
        step={step}
        value={step ? Number(value.toFixed(2)) : Math.round(value)}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && (min === undefined || next >= min))
            onChange(next);
        }}
        aria-label={
          label === "Rotation" ? "Rotation" : `${label} position or size`
        }
      />
    </label>
  );
}

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-zinc-200 p-4">
      <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

function AiPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="absolute bottom-4 right-4 z-20 w-80 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-2xl shadow-violet-950/20">
      <div className="brand-gradient flex items-center gap-3 p-4 text-white">
        <span className="grid size-9 place-items-center rounded-xl bg-white/15">
          <Icon className="size-4" name="ai" />
        </span>
        <div>
          <p className="text-sm font-black">Design Assistant</p>
          <p className="text-[10px] text-white/65">Command-powered AI</p>
        </div>
        <button
          className="ml-auto rounded-lg px-2 py-1 text-xs font-bold hover:bg-white/10"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="p-4">
        <p className="text-xs leading-5 text-zinc-500">
          Describe what you want to change. AI tools are connected through the
          same safe command workflow as editor actions.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs outline-none"
            placeholder="Make the title more playful..."
            disabled
          />
          <button
            className="rounded-xl bg-violet-600 px-3 text-xs font-bold text-white"
            disabled
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}

function layerName(node: Node): string {
  if (node.type === "text") return node.text.content || "Text";
  return node.name ?? node.type;
}

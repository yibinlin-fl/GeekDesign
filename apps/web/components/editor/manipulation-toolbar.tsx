"use client";

import { useEditorStore } from "../../lib/editor-store";

const alignments = [
  ["left", "Align left"],
  ["center", "Align horizontal center"],
  ["right", "Align right"],
  ["top", "Align top"],
  ["middle", "Align vertical middle"],
  ["bottom", "Align bottom"],
] as const;

export function ManipulationToolbar() {
  const store = useEditorStore();
  const selected = store.selectedNodeId
    ? store.document.nodes[store.selectedNodeId]
    : undefined;
  if (store.selectedNodeIds.length === 0) return null;
  if (store.selectedNodeIds.length === 1 && selected?.type === "text")
    return null;
  const multiple = store.selectedNodeIds.length > 1;

  return (
    <div className="absolute left-4 top-3 z-30 flex max-w-[calc(100%-2rem)] items-center gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
      <span className="whitespace-nowrap px-2 text-[10px] font-black text-violet-700">
        {store.selectedNodeIds.length} selected
      </span>
      <Divider />
      {alignments.map(([alignment, label]) => (
        <ToolButton
          key={alignment}
          label={label}
          disabled={!multiple}
          onClick={() => store.alignSelected(alignment)}
        >
          {alignment === "center"
            ? "H"
            : alignment === "middle"
              ? "V"
              : alignment.slice(0, 1).toUpperCase()}
        </ToolButton>
      ))}
      <ToolButton
        label="Distribute horizontally"
        disabled={store.selectedNodeIds.length < 3}
        onClick={() => store.distributeSelected("horizontal")}
      >
        H↔
      </ToolButton>
      <ToolButton
        label="Distribute vertically"
        disabled={store.selectedNodeIds.length < 3}
        onClick={() => store.distributeSelected("vertical")}
      >
        V↕
      </ToolButton>
      <Divider />
      <ToolButton
        label="Group selection"
        disabled={!multiple}
        onClick={store.groupSelected}
      >
        Group
      </ToolButton>
      <ToolButton
        label="Ungroup selection"
        disabled={selected?.type !== "group"}
        onClick={store.ungroupSelected}
      >
        Ungroup
      </ToolButton>
      <Divider />
      <ToolButton
        label="Send to back"
        onClick={() => store.reorderSelected("back")}
      >
        Back
      </ToolButton>
      <ToolButton
        label="Send backward"
        onClick={() => store.reorderSelected("backward")}
      >
        ↓
      </ToolButton>
      <ToolButton
        label="Bring forward"
        onClick={() => store.reorderSelected("forward")}
      >
        ↑
      </ToolButton>
      <ToolButton
        label="Bring to front"
        onClick={() => store.reorderSelected("front")}
      >
        Front
      </ToolButton>
      <Divider />
      {selected?.type === "image" ? (
        <>
          <ToolButton label="Crop image" onClick={store.toggleCropMode}>
            {store.cropMode ? "Done crop" : "Crop"}
          </ToolButton>
          <Divider />
        </>
      ) : null}
      <ToolButton label="Toggle grid" onClick={store.toggleGrid}>
        Grid {store.showGrid ? "on" : "off"}
      </ToolButton>
      <ToolButton label="Toggle snap to grid" onClick={store.toggleSnapToGrid}>
        Snap {store.snapToGrid ? "on" : "off"}
      </ToolButton>
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-zinc-200" />;
}

function ToolButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-bold text-zinc-600 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-25"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

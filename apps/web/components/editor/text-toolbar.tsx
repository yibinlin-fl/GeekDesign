"use client";

import { useEditorStore } from "../../lib/editor-store";

const fonts = ["Arial", "Inter", "Georgia", "Times New Roman", "Courier New"];

export function TextToolbar() {
  const selectedNodeIds = useEditorStore((state) => state.selectedNodeIds);
  const node = useEditorStore((state) =>
    state.selectedNodeId
      ? state.document.nodes[state.selectedNodeId]
      : undefined,
  );
  const updateTextStyle = useEditorStore((state) => state.updateTextStyle);
  const applyRichTextStyle = useEditorStore(
    (state) => state.applyRichTextStyle,
  );
  const textSelection = useEditorStore((state) => state.textSelection);
  const toggleBullets = useEditorStore((state) => state.toggleBullets);
  const updateFillColor = useEditorStore((state) => state.updateFillColor);
  if (selectedNodeIds.length !== 1 || node?.type !== "text") return null;
  const color =
    node.style.fill?.type === "solid" ? node.style.fill.color : "#18181b";
  const hasRange = Boolean(
    textSelection && textSelection.start !== textSelection.end,
  );
  const format = (
    local: Parameters<typeof applyRichTextStyle>[0],
    global: Parameters<typeof updateTextStyle>[0],
  ) => (hasRange ? applyRichTextStyle(local) : updateTextStyle(global));

  return (
    <div
      className="absolute left-1/2 top-2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg"
      aria-label="Text toolbar"
    >
      <select
        className="h-8 w-28 rounded-lg bg-zinc-50 px-2 text-xs font-bold text-zinc-700 outline-none"
        value={node.text.fontFamily}
        onChange={(event) =>
          format(
            { fontFamily: event.target.value },
            { fontFamily: event.target.value },
          )
        }
        aria-label="Toolbar font family"
      >
        {fonts.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>
      <input
        className="h-8 w-14 rounded-lg bg-zinc-50 px-2 text-xs font-bold outline-none"
        type="number"
        min="1"
        value={node.text.fontSize}
        onChange={(event) =>
          format(
            { fontSize: Number(event.target.value) },
            { fontSize: Number(event.target.value) },
          )
        }
        aria-label="Toolbar font size"
      />
      <ToolbarButton
        label="Bold"
        active={node.text.fontWeight >= 700}
        onClick={() =>
          format(
            { fontWeight: node.text.fontWeight >= 700 ? 400 : 700 },
            { fontWeight: node.text.fontWeight >= 700 ? 400 : 700 },
          )
        }
      >
        B
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={false}
        onClick={() => applyRichTextStyle({ italic: true })}
      >
        I
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={false}
        onClick={() => applyRichTextStyle({ underline: true })}
      >
        U
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={false}
        onClick={() => applyRichTextStyle({ strikeThrough: true })}
      >
        S
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-zinc-200" />
      {(["left", "center", "right", "justify"] as const).map((alignment) => (
        <ToolbarButton
          key={alignment}
          label={`Align ${alignment}`}
          active={node.text.textAlign === alignment}
          onClick={() => updateTextStyle({ textAlign: alignment })}
        >
          {alignment === "left"
            ? "≡"
            : alignment === "center"
              ? "≣"
              : alignment === "right"
                ? "≡"
                : "☰"}
        </ToolbarButton>
      ))}
      <span className="mx-1 h-5 w-px bg-zinc-200" />
      <ToolbarButton
        label="Toggle bullets"
        active={Boolean(node.text.paragraphs?.some((item) => item.bullet))}
        onClick={toggleBullets}
      >
        •
      </ToolbarButton>
      <label
        className="grid size-8 place-items-center rounded-lg bg-zinc-50"
        title="Text color"
      >
        <input
          className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
          type="color"
          value={color}
          onChange={(event) =>
            hasRange
              ? applyRichTextStyle({ color: event.target.value })
              : updateFillColor(event.target.value)
          }
          aria-label="Toolbar text color"
        />
      </label>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`grid size-8 place-items-center rounded-lg text-xs font-black transition ${
        active
          ? "bg-violet-100 text-violet-700"
          : "text-zinc-500 hover:bg-zinc-100"
      }`}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

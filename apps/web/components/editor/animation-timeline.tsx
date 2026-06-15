"use client";

import type { ElementAnimation } from "@geekdesign/design-schema";
import { useEffect, useRef, useState } from "react";

import { useEditorStore } from "../../lib/editor-store";

export function AnimationTimeline() {
  const document = useEditorStore((state) => state.document);
  const currentPageId = useEditorStore((state) => state.currentPageId);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const updateSelectedAnimation = useEditorStore(
    (state) => state.updateSelectedAnimation,
  );
  const setPreviewProgress = useEditorStore(
    (state) => state.setAnimationPreviewProgress,
  );
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<number>();
  const page = document.pages.find((item) => item.id === currentPageId);
  const animation = page?.animations?.find(
    (item) => item.nodeId === selectedNodeId,
  );

  useEffect(
    () => () => {
      if (frameRef.current !== undefined)
        cancelAnimationFrame(frameRef.current);
      setPreviewProgress(undefined);
    },
    [setPreviewProgress],
  );

  const play = () => {
    if ((page?.animations?.length ?? 0) === 0) return;
    setPlaying(true);
    const start = performance.now();
    const duration = Math.max(
      1,
      ...(page?.animations ?? []).map((item) => item.delayMs + item.durationMs),
    );
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setPreviewProgress(progress);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      else {
        setPlaying(false);
        window.setTimeout(() => setPreviewProgress(undefined), 250);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const update = (patch: Partial<Omit<ElementAnimation, "nodeId">>) => {
    updateSelectedAnimation({
      effect: animation?.effect ?? "fade-in",
      delayMs: animation?.delayMs ?? 0,
      durationMs: animation?.durationMs ?? 600,
      direction: animation?.direction ?? "left",
      ...patch,
    });
  };

  return (
    <div className="absolute bottom-3 right-3 z-30">
      {open ? (
        <div className="mb-2 w-72 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl">
          <div className="flex items-center gap-2">
            <strong className="text-xs text-zinc-700">
              Animation timeline
            </strong>
            <button
              className="ml-auto rounded-lg bg-violet-600 px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-30"
              onClick={play}
              disabled={playing || (page?.animations?.length ?? 0) === 0}
            >
              {playing ? "Playing" : "Play slide"}
            </button>
          </div>
          {selectedNodeId ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="col-span-2 text-[10px] font-bold text-zinc-500">
                Effect
                <select
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs"
                  value={animation?.effect ?? "none"}
                  onChange={(event) => {
                    if (event.target.value === "none")
                      updateSelectedAnimation(undefined);
                    else
                      update({
                        effect: event.target
                          .value as ElementAnimation["effect"],
                      });
                  }}
                  aria-label="Element animation effect"
                >
                  <option value="none">None</option>
                  <option value="fade-in">Fade in</option>
                  <option value="fly-in">Fly in</option>
                  <option value="zoom-in">Zoom in</option>
                </select>
              </label>
              <NumberField
                label="Delay ms"
                value={animation?.delayMs ?? 0}
                onChange={(delayMs) => update({ delayMs })}
              />
              <NumberField
                label="Duration ms"
                value={animation?.durationMs ?? 600}
                min={50}
                onChange={(durationMs) => update({ durationMs })}
              />
              <div className="col-span-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                {(page?.animations ?? []).map((item, index) => (
                  <span
                    key={item.nodeId}
                    className="inline-block h-full bg-violet-500"
                    style={{
                      width: `${Math.max(8, 100 / Math.max(1, page?.animations?.length ?? 1))}%`,
                      opacity: 1 - index * 0.12,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-zinc-400">
              Select an element to add an entrance animation.
            </p>
          )}
        </div>
      ) : null}
      <button
        className="ml-auto block rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black text-zinc-600 shadow-sm hover:text-violet-700"
        onClick={() => setOpen((value) => !value)}
        aria-label="Toggle animation timeline"
      >
        Animate {page?.animations?.length ? `(${page.animations.length})` : ""}
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-[10px] font-bold text-zinc-500">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs"
        type="number"
        min={min}
        value={value}
        onChange={(event) =>
          onChange(Math.max(min, Number(event.target.value)))
        }
      />
    </label>
  );
}

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { STORAGE_KEY } from "../../lib/editor-store";
import {
  fillLocalTemplate,
  templateCatalog,
  type TemplateSummary,
} from "../../lib/template-catalog";

const categories = [
  { slug: "all", name: "All templates" },
  { slug: "social", name: "Social" },
  { slug: "professional", name: "Professional" },
];

export function TemplateBrowser() {
  const router = useRouter();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TemplateSummary | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const templates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return templateCatalog.filter(
      (template) =>
        (category === "all" || template.category === category) &&
        (!term ||
          template.title.toLowerCase().includes(term) ||
          template.tags.some((tag) => tag.includes(term)) ||
          template.style.includes(term)),
    );
  }, [category, search]);

  const showDetails = (template: TemplateSummary) => {
    setSelected(template);
    setValues(
      Object.fromEntries(
        template.variables.map((variable) => [
          variable.key,
          String(variable.defaultValue ?? ""),
        ]),
      ),
    );
  };

  const createDesign = async () => {
    if (!selected) return;
    setCreating(true);
    let document = fillLocalTemplate(selected, values);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/api/templates/${selected.id}/create-project`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: selected.title, variables: values }),
        },
      );
      if (response.ok) {
        const result = (await response.json()) as {
          data: { document_json: typeof document };
        };
        document = result.data.document_json;
      }
    } catch {
      // Local fallback keeps the templates surface useful without the API process.
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
    router.push("/editor");
  };

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside>
        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Search
          <input
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-violet-400"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates"
          />
        </label>
        <div className="mt-6 space-y-1" aria-label="Template categories">
          {categories.map((item) => (
            <button
              key={item.slug}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                category === item.slug
                  ? "bg-violet-100 text-violet-800"
                  : "text-zinc-600 hover:bg-white"
              }`}
              onClick={() => setCategory(item.slug)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </aside>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm text-zinc-500">{templates.length} templates</p>
            <h2 className="text-xl font-bold">Start from a polished layout</h2>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="template-grid">
          {templates.map((template) => (
            <button
              key={template.id}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg"
              onClick={() => showDetails(template)}
            >
              <Image
                className="aspect-[4/3] w-full object-cover"
                src={template.thumbnail_url}
                alt={`${template.title} preview`}
                width={800}
                height={600}
              />
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">{template.title}</h3>
                  {template.premium ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-700">
                      Premium
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs capitalize text-zinc-500">
                  {template.category} · {template.style}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selected ? (
        <div
          className="fixed inset-0 z-20 grid place-items-center bg-zinc-950/50 p-6"
          role="dialog"
          aria-label="Template details"
        >
          <section className="grid max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
            <Image
              className="h-full min-h-80 w-full object-cover"
              src={selected.thumbnail_url}
              alt={`${selected.title} large preview`}
              width={800}
              height={600}
            />
            <div className="overflow-y-auto p-7">
              <button
                className="float-right text-sm font-semibold text-zinc-500"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-600">
                {selected.category} · {selected.style}
              </p>
              <h2 className="mt-2 text-3xl font-black">{selected.title}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-7 space-y-4">
                {selected.variables.map((variable) => (
                  <label key={variable.key} className="block text-sm font-semibold">
                    {variable.label}
                    <input
                      className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2.5 font-normal outline-none focus:border-violet-400"
                      value={values[variable.key] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [variable.key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <button
                className="mt-8 w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                disabled={creating}
                onClick={createDesign}
              >
                {creating ? "Creating design..." : "Use this template"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

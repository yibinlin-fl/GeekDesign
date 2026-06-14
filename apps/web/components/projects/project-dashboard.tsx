"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch, clearAccessToken } from "../../lib/auth";
import { Icon } from "../ui/icon";

interface ProjectSummary {
  id: string;
  title: string;
  updated_at: string;
  share_enabled: boolean;
  share_token?: string;
}

interface ProjectVersion {
  id: string;
  project_id: string;
  created_at: string;
}

const cardGradients = [
  "from-violet-600 via-purple-500 to-fuchsia-400",
  "from-sky-500 via-indigo-500 to-violet-600",
  "from-orange-400 via-rose-500 to-fuchsia-500",
  "from-emerald-400 via-teal-500 to-sky-500",
];

export function ProjectDashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [error, setError] = useState("");
  const [historyProject, setHistoryProject] = useState<string>();
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setProjects(await apiFetch<ProjectSummary[]>("/projects"));
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load projects",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const action = async (path: string, init: RequestInit) => {
    await apiFetch(path, init);
    await load();
  };

  const showHistory = async (projectId: string) => {
    setHistoryProject(projectId);
    setVersions(
      await apiFetch<ProjectVersion[]>(`/projects/${projectId}/versions`),
    );
  };

  return (
    <main className="min-h-screen bg-[#f7f7fb]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white px-4 py-5 lg:flex lg:flex-col">
        <Link className="flex items-center gap-2.5 px-2 font-black" href="/">
          <span className="brand-gradient grid size-9 place-items-center rounded-xl text-sm text-white">
            G
          </span>
          GeekDesign
        </Link>
        <nav className="mt-9 space-y-1">
          <SideLink icon="home" href="/projects" label="Home" active />
          <SideLink icon="folder" href="/projects" label="My projects" />
          <SideLink icon="grid" href="/templates" label="Templates" />
          <SideLink icon="image" href="/editor" label="Brand assets" />
        </nav>
        <div className="mt-8 px-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
            Workspace
          </p>
          <div className="mt-3 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4">
            <div className="grid size-9 place-items-center rounded-xl bg-white text-violet-600 shadow-sm">
              <Icon className="size-4" name="ai" />
            </div>
            <p className="mt-3 text-sm font-bold">AI design partner</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Intelligent design tools are being connected.
            </p>
          </div>
        </div>
        <button
          className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
          onClick={() => {
            clearAccessToken();
            location.href = "/login";
          }}
        >
          <span className="grid size-8 place-items-center rounded-full bg-violet-100 text-violet-700">
            <Icon className="size-4" name="user" />
          </span>
          Sign out
        </button>
      </aside>

      <div className="lg:ml-64">
        <header className="sticky top-0 z-10 flex h-20 items-center border-b border-zinc-200/80 bg-white/80 px-6 backdrop-blur-xl lg:px-10">
          <div className="relative hidden w-full max-w-md sm:block">
            <Icon
              className="absolute left-3 top-3 size-4 text-zinc-400"
              name="search"
            />
            <input
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-300 focus:bg-white"
              placeholder="Search projects and templates"
            />
          </div>
          <Link
            className="brand-gradient ml-auto inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20"
            href="/editor"
          >
            <Icon className="size-4" name="plus" />
            Create design
          </Link>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <section>
            <p className="text-sm font-semibold text-violet-600">
              Good to see you
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              What will you create today?
            </h1>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <QuickStart
                title="Blank design"
                copy="800 x 600 px"
                icon="plus"
                href="/editor"
                tone="from-violet-600 to-fuchsia-500"
              />
              <QuickStart
                title="Social post"
                copy="Square visual"
                icon="image"
                href="/templates"
                tone="from-orange-400 to-rose-500"
              />
              <QuickStart
                title="Presentation"
                copy="Coming soon"
                icon="file"
                href="/templates"
                tone="from-sky-500 to-indigo-600"
              />
              <QuickStart
                title="Browse templates"
                copy="Get inspired"
                icon="grid"
                href="/templates"
                tone="from-emerald-400 to-teal-600"
              />
            </div>
          </section>

          <section className="mt-12">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-black">My projects</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Pick up where you left off.
                </p>
              </div>
              <Link
                className="text-sm font-bold text-violet-700"
                href="/templates"
              >
                View templates
              </Link>
            </div>

            {error ? (
              <div className="mt-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                <span>
                  {error}. Start the local API or sign in to view cloud
                  projects.
                </span>
                <Link className="font-bold underline" href="/login">
                  Sign in
                </Link>
              </div>
            ) : null}

            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {loading
                ? [0, 1, 2].map((item) => <ProjectSkeleton key={item} />)
                : projects.map((project, index) => (
                    <article
                      key={project.id}
                      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-950/5"
                    >
                      <Link
                        className={`relative block aspect-[16/10] overflow-hidden bg-gradient-to-br ${cardGradients[index % cardGradients.length]}`}
                        href={`/editor?projectId=${project.id}`}
                        aria-label="Open"
                      >
                        <span className="absolute -right-10 -top-12 size-40 rounded-full border-[18px] border-white/20" />
                        <span className="absolute bottom-6 left-6 max-w-[70%] text-2xl font-black leading-tight tracking-tight text-white">
                          Open design
                        </span>
                      </Link>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold">{project.title}</h3>
                            <p className="mt-1 text-xs text-zinc-400">
                              Updated{" "}
                              {new Date(project.updated_at).toLocaleString()}
                            </p>
                          </div>
                          <button
                            className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
                            aria-label={`Rename ${project.title}`}
                            onClick={() => {
                              const title = prompt(
                                "Project name",
                                project.title,
                              );
                              if (title)
                                void action(`/projects/${project.id}/rename`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ title }),
                                });
                            }}
                          >
                            <Icon className="size-4" name="settings" />
                          </button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-zinc-600">
                          <Action
                            label="Duplicate"
                            onClick={() =>
                              void action(`/projects/${project.id}/duplicate`, {
                                method: "POST",
                              })
                            }
                          />
                          <Action
                            label="History"
                            onClick={() => void showHistory(project.id)}
                          />
                          <Action
                            label={project.share_enabled ? "Unshare" : "Share"}
                            onClick={() =>
                              void action(`/projects/${project.id}/share`, {
                                method: "POST",
                                body: JSON.stringify({
                                  enabled: !project.share_enabled,
                                }),
                              })
                            }
                          />
                          <Action
                            label="Delete"
                            danger
                            onClick={() => {
                              if (confirm("Delete this project?"))
                                void action(`/projects/${project.id}`, {
                                  method: "DELETE",
                                });
                            }}
                          />
                        </div>
                      </div>
                    </article>
                  ))}
            </div>
          </section>
        </div>
      </div>

      {historyProject ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-950/40 p-6 backdrop-blur-sm">
          <section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-violet-600">
                  Project timeline
                </p>
                <h2 className="mt-1 text-2xl font-black">Version history</h2>
              </div>
              <button
                className="rounded-lg px-3 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100"
                onClick={() => setHistoryProject(undefined)}
              >
                Close
              </button>
            </div>
            <div className="mt-5 max-h-96 space-y-2 overflow-y-auto">
              {versions.length === 0 ? (
                <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  No versions yet. Autosave creates history snapshots.
                </p>
              ) : (
                versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 p-3 text-sm"
                  >
                    <span>{new Date(version.created_at).toLocaleString()}</span>
                    <button
                      className="font-bold text-violet-700"
                      onClick={() =>
                        void action(
                          `/projects/${historyProject}/versions/${version.id}/restore`,
                          { method: "POST" },
                        ).then(() => showHistory(historyProject))
                      }
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function SideLink({
  icon,
  href,
  label,
  active = false,
}: {
  icon: "home" | "folder" | "grid" | "image";
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-violet-50 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"}`}
      href={href}
    >
      <Icon className="size-4" name={icon} />
      {label}
    </Link>
  );
}

function QuickStart({
  title,
  copy,
  icon,
  href,
  tone,
}: {
  title: string;
  copy: string;
  icon: "plus" | "image" | "file" | "grid";
  href: string;
  tone: string;
}) {
  return (
    <Link
      className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg"
      href={href}
    >
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}
      >
        <Icon className="size-5" name={icon} />
      </span>
      <span>
        <strong className="block text-sm">{title}</strong>
        <span className="mt-1 block text-xs text-zinc-400">{copy}</span>
      </span>
    </Link>
  );
}

function Action({
  label,
  onClick,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`rounded-lg px-2.5 py-1.5 transition hover:bg-zinc-100 ${danger ? "text-rose-600" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ProjectSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="aspect-[16/10] animate-pulse bg-zinc-200" />
      <div className="p-4">
        <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-200" />
        <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-zinc-100" />
      </div>
    </div>
  );
}

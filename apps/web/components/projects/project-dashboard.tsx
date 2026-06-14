"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch, clearAccessToken } from "../../lib/auth";

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

export function ProjectDashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [error, setError] = useState("");
  const [historyProject, setHistoryProject] = useState<string>();
  const [versions, setVersions] = useState<ProjectVersion[]>([]);

  const load = async () => {
    try {
      setProjects(await apiFetch<ProjectSummary[]>("/projects"));
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load projects",
      );
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
    <main className="mx-auto max-w-6xl p-8">
      <nav className="flex items-center gap-5 text-sm font-semibold">
        <Link href="/editor">Editor</Link>
        <Link href="/templates">Templates</Link>
        <Link href="/projects">Projects</Link>
        <button
          className="ml-auto text-zinc-500"
          onClick={() => {
            clearAccessToken();
            location.href = "/login";
          }}
        >
          Sign out
        </button>
      </nav>
      <div className="mt-12 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold">My projects</h1>
          <p className="mt-2 text-zinc-600">
            Cloud projects, history, and sharing.
          </p>
        </div>
        <Link
          className="rounded-lg bg-violet-600 px-4 py-2 text-white"
          href="/editor"
        >
          New design
        </Link>
      </div>
      {error ? (
        <div className="mt-8 rounded-xl bg-amber-50 p-4 text-amber-900">
          {error}.{" "}
          <Link className="font-semibold underline" href="/login">
            Sign in
          </Link>
        </div>
      ) : null}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <article
            key={project.id}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <h2 className="font-bold">{project.title}</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Updated {new Date(project.updated_at).toLocaleString()}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <Link
                className="rounded bg-violet-100 px-3 py-1.5 text-violet-800"
                href={`/editor?projectId=${project.id}`}
              >
                Open
              </Link>
              <button
                className="rounded bg-zinc-100 px-3 py-1.5"
                onClick={() => {
                  const title = prompt("Project name", project.title);
                  if (title)
                    void action(`/projects/${project.id}/rename`, {
                      method: "PATCH",
                      body: JSON.stringify({ title }),
                    });
                }}
              >
                Rename
              </button>
              <button
                className="rounded bg-zinc-100 px-3 py-1.5"
                onClick={() =>
                  void action(`/projects/${project.id}/duplicate`, {
                    method: "POST",
                  })
                }
              >
                Duplicate
              </button>
              <button
                className="rounded bg-zinc-100 px-3 py-1.5"
                onClick={() => void showHistory(project.id)}
              >
                History
              </button>
              <button
                className="rounded bg-zinc-100 px-3 py-1.5"
                onClick={() =>
                  void action(`/projects/${project.id}/share`, {
                    method: "POST",
                    body: JSON.stringify({ enabled: !project.share_enabled }),
                  })
                }
              >
                {project.share_enabled ? "Unshare" : "Share"}
              </button>
              {project.share_enabled && project.share_token ? (
                <Link
                  className="rounded bg-emerald-100 px-3 py-1.5 text-emerald-800"
                  href={`/share/${project.share_token}`}
                >
                  View link
                </Link>
              ) : null}
              <button
                className="rounded bg-red-50 px-3 py-1.5 text-red-700"
                onClick={() => {
                  if (confirm("Delete this project?"))
                    void action(`/projects/${project.id}`, {
                      method: "DELETE",
                    });
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      {historyProject ? (
        <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Version history</h2>
            <button
              className="text-sm text-zinc-500"
              onClick={() => setHistoryProject(undefined)}
            >
              Close
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {versions.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No versions yet. Autosave creates history snapshots.
              </p>
            ) : (
              versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 text-sm"
                >
                  <span>{new Date(version.created_at).toLocaleString()}</span>
                  <button
                    className="font-semibold text-violet-700"
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
      ) : null}
    </main>
  );
}

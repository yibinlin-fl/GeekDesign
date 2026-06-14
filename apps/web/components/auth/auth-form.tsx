"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch, setAccessToken } from "../../lib/auth";
import { Icon } from "../ui/icon";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const result = await apiFetch<{ access_token: string }>(
        `/users/${mode}`,
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            ...(mode === "register" ? { display_name: displayName } : {}),
          }),
        },
      );
      setAccessToken(result.access_token);
      router.push("/projects");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Authentication failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#211934] p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -left-24 top-24 size-80 rounded-full bg-violet-500/30 blur-[80px]" />
        <div className="absolute -bottom-32 right-0 size-96 rounded-full bg-fuchsia-500/25 blur-[100px]" />
        <Link className="relative flex items-center gap-3 font-black" href="/">
          <span className="brand-gradient grid size-10 place-items-center rounded-xl">
            G
          </span>
          GeekDesign
        </Link>
        <div className="relative my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-violet-100">
            <Icon className="size-3.5" name="ai" />
            Design without the blank-page anxiety
          </div>
          <h1 className="mt-6 text-5xl font-black tracking-[-0.05em]">
            Your next great idea deserves a beautiful canvas.
          </h1>
          <p className="mt-5 max-w-md leading-7 text-violet-100/70">
            Create visual stories, organize your projects, and let intelligent
            tools handle the repetitive work.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {["Templates", "Smart editor", "Cloud projects"].map((label) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-bold text-white/75"
              >
                <span className="mb-3 block size-2 rounded-full bg-fuchsia-400" />
                {label}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/35">
          Built on a controlled command system, ready for serious work.
        </p>
      </section>

      <section className="grid place-items-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link
            className="mb-12 flex items-center gap-2 font-black lg:hidden"
            href="/"
          >
            <span className="brand-gradient grid size-9 place-items-center rounded-xl text-white">
              G
            </span>
            GeekDesign
          </Link>
          <p className="text-sm font-bold text-violet-600">
            {mode === "login" ? "Welcome back" : "Start creating today"}
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">
            {mode === "login"
              ? "Sign in to your space"
              : "Create your workspace"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {mode === "login"
              ? "Continue working on your projects and designs."
              : "One account for your designs, assets, and templates."}
          </p>
          <div className="mt-8 space-y-4">
            {mode === "register" ? (
              <Field
                label="Display name"
                value={displayName}
                onChange={setDisplayName}
              />
            ) : null}
            <Field
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
            />
            {error ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            <button
              className="brand-gradient w-full rounded-xl px-4 py-3.5 font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 disabled:opacity-50"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </div>
          <p className="mt-6 text-center text-sm text-zinc-500">
            {mode === "login"
              ? "New to GeekDesign?"
              : "Already have an account?"}{" "}
            <Link
              className="font-bold text-violet-700"
              href={mode === "login" ? "/register" : "/login"}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-bold text-zinc-700">
      {label}
      <input
        className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 font-normal outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

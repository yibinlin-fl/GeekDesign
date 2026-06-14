"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch, setAccessToken } from "../../lib/auth";

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
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <Link href="/" className="font-black text-violet-700">
          GeekDesign
        </Link>
        <h1 className="mt-5 text-3xl font-bold">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>
        <div className="mt-6 space-y-4">
          {mode === "register" ? (
            <input
              className="w-full rounded-lg border p-3"
              placeholder="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          ) : null}
          <input
            className="w-full rounded-lg border p-3"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="w-full rounded-lg border p-3"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            className="w-full rounded-lg bg-violet-600 px-4 py-3 font-semibold text-white"
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Register"}
          </button>
        </div>
        <Link
          className="mt-5 block text-sm text-violet-700"
          href={mode === "login" ? "/register" : "/login"}
        >
          {mode === "login" ? "Create an account" : "Already have an account"}
        </Link>
      </section>
    </main>
  );
}

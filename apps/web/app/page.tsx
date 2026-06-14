import Link from "next/link";

export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <section className="max-w-xl rounded-2xl bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-600">
          GeekDesign
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Design platform foundation
        </h1>
        <p className="mt-4 text-zinc-600">
          A scene graph based visual editor powered by controlled commands and a
          custom Canvas renderer.
        </p>
        <div className="mt-7 flex gap-3">
          <Link
            className="inline-flex rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white"
            href="/editor"
          >
            Open editor
          </Link>
          <Link
            className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 font-semibold"
            href="/login"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-5xl p-10">
      <nav className="flex gap-5 text-sm font-semibold">
        <Link href="/editor">Editor</Link>
        <Link href="/templates">Templates</Link>
        <Link href="/projects">Projects</Link>
      </nav>
      <h1 className="mt-12 text-4xl font-bold">Projects</h1>
      <p className="mt-3 text-zinc-600">
        Saved cloud projects will appear here.
      </p>
      <Link
        className="mt-8 inline-block rounded-lg bg-violet-600 px-4 py-2 text-white"
        href="/editor"
      >
        Open editor
      </Link>
    </main>
  );
}

import Link from "next/link";

export default function TemplatesPage() {
  return (
    <main className="mx-auto max-w-5xl p-10">
      <Nav />
      <h1 className="mt-12 text-4xl font-bold">Templates</h1>
      <p className="mt-3 text-zinc-600">
        Template browsing is ready for the next milestone.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-5">
        {["Invitation", "Resume", "Presentation"].map((name) => (
          <div
            key={name}
            className="aspect-[4/3] rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <span className="text-sm font-semibold">{name}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

function Nav() {
  return (
    <nav className="flex gap-5 text-sm font-semibold">
      <Link href="/editor">Editor</Link>
      <Link href="/templates">Templates</Link>
      <Link href="/projects">Projects</Link>
    </nav>
  );
}

import Link from "next/link";

import { TemplateBrowser } from "../../components/templates/template-browser";

export default function TemplatesPage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl p-6 md:p-10">
      <nav className="flex items-center gap-5 text-sm font-semibold">
        <Link className="mr-auto text-lg font-black text-violet-700" href="/">
          GeekDesign
        </Link>
        <Link href="/editor">Editor</Link>
        <Link className="text-violet-700" href="/templates">
          Templates
        </Link>
        <Link href="/projects">Projects</Link>
      </nav>
      <header className="mt-12 max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-widest text-violet-600">
          Template library
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
          Make the first draft feel finished.
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Browse reusable Design Documents, personalize their variables, and
          continue editing with the full GeekDesign command workflow.
        </p>
      </header>
      <TemplateBrowser />
    </main>
  );
}

import Link from "next/link";

import { Icon } from "../components/ui/icon";

const features = [
  {
    title: "Design with confidence",
    copy: "A focused visual editor with layers, reusable templates, and precise controls.",
    icon: "elements" as const,
    tone: "from-violet-500 to-indigo-500",
  },
  {
    title: "Your assets, ready",
    copy: "Upload brand images once, then place and replace them from the editor.",
    icon: "image" as const,
    tone: "from-fuchsia-500 to-rose-500",
  },
  {
    title: "AI that uses real tools",
    copy: "Every AI edit follows the same command workflow as a human edit.",
    icon: "ai" as const,
    tone: "from-sky-500 to-violet-500",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#faf9ff]">
      <nav className="mx-auto flex h-20 max-w-7xl items-center px-6 lg:px-8">
        <Brand />
        <div className="ml-12 hidden items-center gap-7 text-sm font-semibold text-zinc-600 md:flex">
          <Link className="transition hover:text-violet-700" href="/templates">
            Templates
          </Link>
          <a className="transition hover:text-violet-700" href="#features">
            Features
          </a>
          <Link className="transition hover:text-violet-700" href="/projects">
            Projects
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link
            className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-white sm:inline-flex"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5"
            href="/editor"
          >
            Start designing
            <Icon className="size-4" name="arrow" />
          </Link>
        </div>
      </nav>

      <section className="hero-grid relative border-y border-violet-100/70 px-6 pb-20 pt-16 lg:pb-28 lg:pt-24">
        <div className="absolute left-1/2 top-0 -z-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-300/30 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-violet-700 shadow-sm">
              <Icon className="size-3.5" name="ai" />
              Intelligent visual workspace
            </div>
            <h1 className="mt-7 text-5xl font-black tracking-[-0.055em] text-zinc-950 sm:text-6xl lg:text-7xl">
              Make every idea
              <span className="block bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 bg-clip-text text-transparent">
                beautifully visual.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
              GeekDesign brings templates, a precise canvas, your brand assets,
              and an AI-ready command system into one calm workspace.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                className="brand-gradient inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-bold text-white shadow-xl shadow-violet-500/25 transition hover:-translate-y-0.5"
                href="/editor"
              >
                Create a design
                <Icon className="size-5" name="arrow" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-3.5 font-bold text-zinc-800 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
                href="/templates"
              >
                Explore templates
              </Link>
            </div>
          </div>
          <EditorPreview />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600">
            Built to grow with you
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950">
            A serious design platform that still feels easy.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-950/5"
            >
              <div
                className={`grid size-11 place-items-center rounded-2xl bg-gradient-to-br ${feature.tone} text-white shadow-lg`}
              >
                <Icon className="size-5" name={feature.icon} />
              </div>
              <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {feature.copy}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Brand() {
  return (
    <Link className="flex items-center gap-2.5" href="/">
      <span className="brand-gradient grid size-9 place-items-center rounded-xl text-sm font-black text-white shadow-lg shadow-violet-500/20">
        G
      </span>
      <span className="text-lg font-black tracking-tight text-zinc-950">
        GeekDesign
      </span>
    </Link>
  );
}

function EditorPreview() {
  return (
    <div className="glass-panel relative mx-auto mt-16 max-w-5xl overflow-hidden rounded-[28px] p-2">
      <div className="overflow-hidden rounded-[22px] border border-zinc-200 bg-[#202027] shadow-2xl">
        <div className="flex h-11 items-center gap-2 border-b border-white/10 px-4">
          <span className="size-2.5 rounded-full bg-rose-400" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-4 text-[11px] font-semibold text-white/50">
            Social post - GeekDesign
          </span>
          <span className="ml-auto rounded-md bg-violet-500 px-3 py-1 text-[10px] font-bold text-white">
            Share
          </span>
        </div>
        <div className="grid h-[390px] grid-cols-[56px_190px_1fr_210px]">
          <div className="border-r border-white/10 p-2">
            {["elements", "text", "image", "layers"].map((name, index) => (
              <div
                key={name}
                className={`mb-2 grid aspect-square place-items-center rounded-xl ${
                  index === 0 ? "bg-violet-500 text-white" : "text-white/45"
                }`}
              >
                <Icon className="size-4" name={name as "elements"} />
              </div>
            ))}
          </div>
          <div className="border-r border-zinc-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Elements
            </p>
            <div className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-[10px] text-zinc-400">
              Search anything
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                "bg-violet-500",
                "bg-fuchsia-400",
                "bg-sky-400",
                "bg-amber-300",
              ].map((color) => (
                <span
                  key={color}
                  className={`aspect-square rounded-xl ${color}`}
                />
              ))}
            </div>
          </div>
          <div className="grid place-items-center bg-[#ececf0] p-8">
            <div className="relative aspect-[4/3] w-full max-w-[420px] overflow-hidden rounded-sm bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-400 shadow-2xl">
              <div className="absolute -right-10 -top-12 size-48 rounded-full border-[22px] border-white/20" />
              <div className="absolute bottom-9 left-9">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">
                  Create boldly
                </p>
                <p className="mt-2 text-3xl font-black leading-none tracking-tight text-white">
                  Ideas look
                  <br />
                  better here.
                </p>
              </div>
            </div>
          </div>
          <div className="border-l border-zinc-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Properties
            </p>
            {["Position", "Size", "Fill", "Opacity"].map((label) => (
              <div key={label} className="mt-4">
                <p className="text-[10px] font-semibold text-zinc-500">
                  {label}
                </p>
                <div className="mt-1.5 h-7 rounded-lg border border-zinc-200 bg-zinc-50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

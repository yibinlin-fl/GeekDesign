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
          The editor shell is ready for the Design Schema, Scene Graph, Command
          System, and renderer.
        </p>
      </section>
    </main>
  );
}

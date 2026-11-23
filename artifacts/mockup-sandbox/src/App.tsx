import { Suspense, lazy, useEffect, useMemo, useState, type ComponentType, type LazyExoticComponent } from "react";
import { mockups } from "virtual:mockups";

/**
 * Mockup sandbox: renders any component in src/components/mockups.
 *   /                       → index of all mockups
 *   /preview/<relative/path> → that mockup, full screen
 */

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const cache = new Map<string, LazyExoticComponent<ComponentType>>();

function usePath() {
  const [path, setPath] = useState(() => window.location.pathname.slice(base.length) || "/");
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname.slice(base.length) || "/");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

function Preview({ name }: { name: string }) {
  const Component = useMemo(() => {
    const loader = mockups[name];
    if (!loader) return null;
    if (!cache.has(name)) cache.set(name, lazy(loader));
    return cache.get(name)!;
  }, [name]);

  if (!Component) {
    return (
      <main className="grid min-h-dvh place-items-center p-8 text-center">
        <div>
          <p className="font-mono text-sm text-nexus-red">No mockup named “{name}”.</p>
          <a className="mt-3 inline-block text-nexus-cyan underline" href={`${base}/`}>
            Back to index
          </a>
        </div>
      </main>
    );
  }
  return (
    <Suspense fallback={<p className="p-8 font-mono text-sm text-nexus-cyan">Loading…</p>}>
      <Component />
    </Suspense>
  );
}

export default function App() {
  const path = usePath();
  if (path.startsWith("/preview/")) return <Preview name={decodeURIComponent(path.slice("/preview/".length))} />;

  const names = Object.keys(mockups);
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-nexus-cyan/80">NEXUS · MOCKUP SANDBOX</p>
      <h1 className="mt-2 text-3xl font-bold">Component previews</h1>
      <p className="mt-2 text-slate-400">
        Drop a component (default export) into <code className="text-nexus-cyan">src/components/mockups/</code> and it
        appears here.
      </p>
      <ul className="mt-8 space-y-2">
        {names.length === 0 && <li className="text-slate-500">No mockups yet.</li>}
        {names.map((name) => (
          <li key={name}>
            <a
              href={`${base}/preview/${name}`}
              className="block rounded-xl border border-nexus-cyan/20 bg-white/[0.03] px-4 py-3 font-semibold transition-colors hover:border-nexus-cyan/60"
            >
              {name}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-12">
      <div className="rounded-2xl bg-white p-6 sm:p-8 text-lg text-stone-700 shadow-sm ring-1 ring-stone-200/60">
        {children}
      </div>
    </div>
  );
}

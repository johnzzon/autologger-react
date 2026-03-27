import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-6 max-w-3xl rounded-2xl bg-white p-8 text-lg text-gray-800 shadow-xl">
      {children}
    </div>
  );
}

import { useEffect, useState } from "react";

interface WeeklyDuration {
  week: string;
  hours: string;
}

export default function FlexView() {
  const [weeks, setWeeks] = useState<WeeklyDuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/flex")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch flex data");
        return res.json();
      })
      .then((data) => setWeeks(data.weeklyDurations))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-stone-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-stone-800 mb-4">Weekly Hours</h1>
      <div className="space-y-1">
        {weeks.map((w) => {
          const hours = parseFloat(w.hours);
          const isOver = hours >= 40;
          return (
            <div key={w.week} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-stone-50 transition-colors">
              <span className="font-mono text-sm text-stone-600">{w.week}</span>
              <span className={`tabular-nums text-sm font-medium ${isOver ? "text-emerald-600" : "text-stone-500"}`}>
                {w.hours}h
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

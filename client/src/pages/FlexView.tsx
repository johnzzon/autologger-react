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

  if (loading) return <p className="text-gray-500">Loading weekly hours...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Flex / Weekly Hours</h1>
      <table className="w-full">
        <tbody>
          {weeks.map((w) => (
            <tr key={w.week} className="border-t border-gray-100">
              <td className="py-1 font-mono">{w.week}</td>
              <td className="py-1 text-right pl-12 tabular-nums">{w.hours}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

interface CalendarEvent {
  uuid: string;
  summary: string;
  shortSummary: string;
  summaryMessage: string;
  project: string | null;
  durationHours: number;
  durationFormatted: string;
  isJiraIssue: boolean;
  jiraIssue: string | null;
  jiraUrl: string | null;
  harvestMessage: string;
}

interface EventsResponse {
  date: string;
  yesterdayDate: string;
  tomorrowDate: string;
  totalDuration: number;
  events: CalendarEvent[];
}

interface LogStatus {
  [uuid: string]: "loading" | "success" | "error";
}

export default function DailyView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<LogStatus>({});
  const [jiraTitles, setJiraTitles] = useState<Record<string, string>>({});

  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  // Compute nav dates from URL param so they work during loading
  const [y, m, d] = date.split("-").map(Number);
  const yesterdayDate = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().split("T")[0];
  const tomorrowDate = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().split("T")[0];

  const [bustCache, setBustCache] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setJiraTitles({});
    const params = new URLSearchParams({ date });
    if (bustCache) params.set("refresh", "1");
    fetch(`/api/events?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch events");
        return res.json();
      })
      .then((data) => setData(data))
      .catch((err) => setError(err.message))
      .finally(() => {
        setLoading(false);
        setBustCache(false);
      });
  }, [date, bustCache]);

  // Fetch Jira titles asynchronously after events load
  useEffect(() => {
    if (!data?.events.length) return;
    const jiraKeys = data.events
      .filter((e) => e.isJiraIssue && e.jiraIssue)
      .map((e) => e.jiraIssue!);
    if (jiraKeys.length === 0) return;

    fetch(`/api/jira/titles?keys=${jiraKeys.join(",")}`)
      .then((res) => res.json())
      .then((data) => setJiraTitles(data.titles ?? {}))
      .catch(() => {}); // Silently fail — calendar summary is the fallback
  }, [data]);

  // Re-trigger Harvest platform script after events render and after Jira titles load
  useEffect(() => {
    if (!data?.events.length) return;
    // Remove styled class so Harvest re-processes elements with updated data-item
    document.querySelectorAll(".harvest-timer.styled").forEach((el) => {
      el.classList.remove("styled");
      el.innerHTML = "";
    });
    const id = "harvest-platform-script";
    const old = document.getElementById(id);
    if (old) old.remove();
    const script = document.createElement("script");
    script.id = id;
    script.src = "https://platform.harvestapp.com/assets/platform.js";
    script.async = true;
    document.head.appendChild(script);
  }, [data, jiraTitles]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "k") navigate(yesterdayDate);
      if (e.key === "ArrowRight" || e.key === "j") navigate(tomorrowDate);
      if (e.key === "t") navigate(new Date().toISOString().split("T")[0]);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [yesterdayDate, tomorrowDate]);

  function navigate(newDate: string) {
    setSearchParams({ date: newDate });
  }

  async function logTime(event: CalendarEvent) {
    const key = `${event.uuid}-jira`;
    setLogStatus((s) => ({ ...s, [key]: "loading" }));

    try {
      const body = {
        duration: event.durationFormatted,
        message: event.summaryMessage,
        jira: event.jiraIssue,
      };

      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      const result = data.results?.[0];

      if (result?.status === "success") {
        setLogStatus((s) => ({ ...s, [key]: "success" }));
      } else {
        setLogStatus((s) => ({ ...s, [key]: "error" }));
      }
    } catch {
      setLogStatus((s) => ({ ...s, [key]: "error" }));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Autolog</h1>

      <div className="flex items-center gap-3 mb-6 text-lg">
        <button
          onClick={() => navigate(yesterdayDate)}
          className="text-gray-500 hover:text-gray-900"
        >
          -
        </button>
        <span className="font-mono">{date}</span>
        <button
          onClick={() => navigate(tomorrowDate)}
          className="text-gray-500 hover:text-gray-900"
        >
          +
        </button>
        <button
          onClick={() => setBustCache(true)}
          className="ml-auto text-sm text-gray-400 hover:text-gray-900"
          title="Refresh calendar data"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-gray-500">Loading events...</p>}

      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && data && (
        <>
          <table className="w-full text-left">
            <tbody>
              {data.events.map((event) => (
                <tr key={event.uuid} className="border-t border-gray-100">
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {event.isJiraIssue && (
                      <LogButton
                        status={logStatus[`${event.uuid}-jira`]}
                        onClick={() => logTime(event)}
                        label="J"
                      />
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <div
                      className="harvest-timer inline-block"
                      data-item={JSON.stringify({
                        id: event.jiraIssue || "",
                        name: event.jiraIssue && jiraTitles[event.jiraIssue]
                          ? `${event.jiraIssue}: ${jiraTitles[event.jiraIssue]}`
                          : event.harvestMessage,
                      })}
                    />
                  </td>
                  <td className="py-2 pr-8">
                    <span className="text-gray-400">{event.project}: </span>
                    <EventLink event={event} jiraTitle={event.jiraIssue ? jiraTitles[event.jiraIssue] : undefined} />
                  </td>
                  <td className="py-2 text-right whitespace-nowrap tabular-nums">
                    {event.durationHours} h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.events.length === 0 && (
            <p className="text-gray-400 mt-4">No events for this date.</p>
          )}

          {data.events.length > 0 && (
            <p className="mt-4 font-semibold">Total: {data.totalDuration} h</p>
          )}
        </>
      )}
    </div>
  );
}

function EventLink({ event, jiraTitle }: { event: CalendarEvent; jiraTitle?: string }) {
  if (event.isJiraIssue && event.jiraUrl) {
    return (
      <span>
        <a href={event.jiraUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {event.jiraIssue}{" "}
          {jiraTitle !== undefined
            ? jiraTitle
            : <span className="inline-block w-32 h-4 bg-gray-200 rounded animate-pulse align-middle" />
          }
        </a>
        {event.summaryMessage && <div className="text-sm text-gray-500">{event.summaryMessage}</div>}
      </span>
    );
  }
  return <span>{event.shortSummary}</span>;
}

function LogButton({
  status,
  onClick,
  label,
}: {
  status?: "loading" | "success" | "error";
  onClick: () => void;
  label: string;
}) {
  if (status === "loading") {
    return <span className="inline-block w-7 text-center text-gray-400 animate-pulse">...</span>;
  }
  if (status === "success") {
    return <span className="inline-block w-7 text-center text-green-600">ok</span>;
  }
  if (status === "error") {
    return (
      <button onClick={onClick} className="inline-block w-7 text-center text-red-600 hover:text-red-800" title="Failed — click to retry">
        !
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="inline-block w-7 text-center cursor-pointer"
      title={`Log to ${label === "J" ? "Jira" : "Fibery"}`}
    >
      ⏱
    </button>
  );
}

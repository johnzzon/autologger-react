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

function formatDateHeading(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  const diffDays = Math.round((date.getTime() - dateOnly.getTime()) / 86400000);

  const weekday = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  let relative = "";
  if (diffDays === 0) relative = "Today";
  else if (diffDays === -1) relative = "Yesterday";
  else if (diffDays === 1) relative = "Tomorrow";

  return { weekday, monthDay, relative };
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

  function logAllJira() {
    if (!data) return;
    const jiraEvents = data.events.filter((e) => e.isJiraIssue);
    for (const event of jiraEvents) {
      logTime(event);
    }
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

  const heading = formatDateHeading(date);
  const isToday = heading.relative === "Today";

  return (
    <div>
      {/* Date navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(yesterdayDate)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Previous day (k)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="text-center min-w-[180px]">
            <div className="text-lg font-semibold text-stone-800">
              {heading.weekday}
              {heading.relative && (
                <span className="ml-2 text-xs font-medium text-stone-400 uppercase tracking-wide">{heading.relative}</span>
              )}
            </div>
            <div className="text-sm text-stone-400">{heading.monthDay}</div>
          </div>
          <button
            onClick={() => navigate(tomorrowDate)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Next day (j)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {!isToday && (
            <button
              onClick={() => navigate(new Date().toISOString().split("T")[0])}
              className="ml-2 px-2.5 py-1 text-xs font-medium text-stone-500 bg-stone-100 rounded-md hover:bg-stone-200 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => setBustCache(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-400 rounded-lg hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
          title="Refresh calendar data"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 6A6 6 0 0 1 13.36 4.36L14 6M2 10l.64 1.64A6 6 0 0 0 12.49 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Refresh
        </button>
      </div>

      {loading && (
        <div className="space-y-3 py-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="space-y-1.5">
            {data.events.map((event) => (
              <div key={event.uuid} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-stone-50 transition-colors group">
                <div className="flex items-center gap-1.5 shrink-0">
                  {event.isJiraIssue ? (
                    <LogButton
                      status={logStatus[`${event.uuid}-jira`]}
                      onClick={() => logTime(event)}
                      label="J"
                    />
                  ) : (
                    <span className="inline-block w-7" />
                  )}
                  <div
                    className="harvest-timer inline-block"
                    data-item={JSON.stringify({
                      id: event.jiraIssue || "",
                      name: event.jiraIssue && jiraTitles[event.jiraIssue]
                        ? `${event.jiraIssue}: ${jiraTitles[event.jiraIssue]}`
                        : event.harvestMessage,
                    })}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    {event.project && (
                      <span className="shrink-0 font-medium text-stone-400 uppercase tracking-wide">{event.project}</span>
                    )}
                    <span className="truncate">
                      <EventLink event={event} jiraTitle={event.jiraIssue ? jiraTitles[event.jiraIssue] : undefined} />
                    </span>
                  </div>
                  {event.isJiraIssue && event.summaryMessage && (
                    <div className="text-sm text-stone-400 mt-0.5 truncate">{event.summaryMessage}</div>
                  )}
                </div>
                <div className="shrink-0 tabular-nums font-medium text-stone-500">
                  {event.durationHours}h
                </div>
              </div>
            ))}
          </div>

          {data.events.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              <div className="text-3xl mb-2">📭</div>
              No events for this date.
            </div>
          )}

          {data.events.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-100">
              <div>
                {data.events.some((e) => e.isJiraIssue) && (
                  <button
                    onClick={logAllJira}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-500 bg-stone-100 rounded-lg hover:bg-stone-200 hover:text-stone-700 transition-colors cursor-pointer"
                  >
                    Log all to Jira
                  </button>
                )}
              </div>
              <div className="text-sm font-semibold text-stone-700 tabular-nums">
                Total: {data.totalDuration}h
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventLink({ event, jiraTitle }: { event: CalendarEvent; jiraTitle?: string }) {
  if (event.isJiraIssue && event.jiraUrl) {
    return (
      <a href={event.jiraUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">
        <span className="font-medium">{event.jiraIssue}</span>{" "}
        {jiraTitle !== undefined
          ? <span className="text-stone-600">{jiraTitle}</span>
          : <span className="inline-block w-32 h-3.5 bg-stone-200 rounded animate-pulse align-middle" />
        }
      </a>
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
  const base = "inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-medium transition-all";

  if (status === "loading") {
    return <span className={`${base} text-stone-400 animate-pulse`}>...</span>;
  }
  if (status === "success") {
    return <span className={`${base} text-emerald-600 bg-emerald-50`}>&#10003;</span>;
  }
  if (status === "error") {
    return (
      <button onClick={onClick} className={`${base} text-red-600 bg-red-50 hover:bg-red-100 cursor-pointer`} title="Failed — click to retry">
        !
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`${base} text-stone-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer`}
      title={`Log to ${label === "J" ? "Jira" : "Fibery"}`}
    >
      <span className="text-lg">⏱</span>
    </button>
  );
}

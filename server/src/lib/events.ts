import ical from "node-ical";

export interface ParsedEvent {
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

interface RawEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
}

function parseProject(summary: string): string | null {
  const match = summary.match(/^(?<project>[A-Z\s]*):/);
  return match?.groups?.project?.trim() || null;
}

function parseJiraIssue(summary: string): string | null {
  const match = summary.match(/(?<jira>[A-Z\d]+-[\d]+)/);
  return match?.groups?.jira || null;
}

function getShortSummary(summary: string): string {
  return summary.replace(/^[A-Z\s]*:\s*/, "");
}

function getSummaryMessage(shortSummary: string): string {
  return shortSummary.replace(/^(#\d+)\s|([A-Z\d]+-[\d]+)\s/, "");
}

function getJiraUrl(jiraIssue: string): string {
  const host = process.env.JIRA_HOST;
  if (!host) throw new Error("JIRA_HOST not configured");
  return `${host}/browse/${jiraIssue}`;
}

function getDurationMs(start: Date, end: Date): number {
  return end.getTime() - start.getTime();
}

function formatDuration(ms: number): { hours: number; formatted: string } {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hours = h + m / 60;
  const formatted = `${h}h ${m}m`;
  return { hours, formatted };
}

function buildParsedEvent(uid: string, summary: string, durationMs: number): ParsedEvent {
  const project = parseProject(summary);
  const jiraIssue = parseJiraIssue(summary);
  const shortSummary = getShortSummary(summary);
  const summaryMessage = getSummaryMessage(shortSummary);
  const { hours, formatted } = formatDuration(durationMs);

  return {
    uuid: uid,
    summary,
    shortSummary,
    summaryMessage,
    project,
    durationHours: Math.round(hours * 100) / 100,
    durationFormatted: formatted,
    isJiraIssue: !!jiraIssue,
    jiraIssue,
    jiraUrl: jiraIssue ? getJiraUrl(jiraIssue) : null,
    harvestMessage: jiraIssue ? `${jiraIssue}: ${summaryMessage}` : shortSummary,
  };
}

function filterEventsByDate(events: RawEvent[], date: string): RawEvent[] {
  const dayStart = new Date(date + "T00:00:00");
  const dayEnd = new Date(date + "T00:00:00");
  dayEnd.setDate(dayEnd.getDate() + 1);

  return events.filter((e) => e.start >= dayStart && e.start < dayEnd);
}

function aggregateEvents(events: RawEvent[]): ParsedEvent[] {
  const aggregated = new Map<string, { uid: string; summary: string; durationMs: number }>();

  for (const event of events) {
    const key = `${parseProject(event.summary) ?? ""}::${event.summary}`;
    const existing = aggregated.get(key);
    const durationMs = getDurationMs(event.start, event.end);

    if (existing) {
      existing.durationMs += durationMs;
    } else {
      aggregated.set(key, { uid: event.uid, summary: event.summary, durationMs });
    }
  }

  const parsed = Array.from(aggregated.values()).map((e) =>
    buildParsedEvent(e.uid, e.summary, e.durationMs)
  );

  parsed.sort((a, b) => a.summary.localeCompare(b.summary));
  return parsed;
}

let icalCache: { url: string; data: ical.CalendarResponse; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchIcalData(icalUrl: string, bust = false): Promise<ical.CalendarResponse> {
  if (!bust && icalCache && icalCache.url === icalUrl && Date.now() - icalCache.timestamp < CACHE_TTL_MS) {
    return icalCache.data;
  }
  const data = await ical.async.fromURL(icalUrl);
  icalCache = { url: icalUrl, data, timestamp: Date.now() };
  return data;
}

export function invalidateIcalCache(): void {
  icalCache = null;
}

async function fetchRawEvents(icalUrl: string, bust = false): Promise<RawEvent[]> {
  const data = await fetchIcalData(icalUrl, bust);

  const rawEvents: RawEvent[] = [];
  for (const component of Object.values(data)) {
    if (component.type !== "VEVENT") continue;
    const vevent = component as ical.VEvent;
    if (!vevent.start || !vevent.end) continue;
    rawEvents.push({
      uid: vevent.uid,
      summary: vevent.summary || "",
      start: new Date(vevent.start),
      end: new Date(vevent.end),
    });
  }

  return rawEvents;
}

export async function fetchEventsForDate(icalUrl: string, date: string, bust = false) {
  const rawEvents = await fetchRawEvents(icalUrl, bust);
  const filtered = filterEventsByDate(rawEvents, date);
  const events = aggregateEvents(filtered);

  const totalDuration = events.reduce((sum, e) => sum + e.durationHours, 0);

  // Use UTC dates to avoid timezone offset issues
  const [y, m, d] = date.split("-").map(Number);
  const yesterdayDate = new Date(Date.UTC(y, m - 1, d - 1));
  const tomorrowDate = new Date(Date.UTC(y, m - 1, d + 1));

  return {
    date,
    yesterdayDate: yesterdayDate.toISOString().split("T")[0],
    tomorrowDate: tomorrowDate.toISOString().split("T")[0],
    totalDuration: Math.round(totalDuration * 100) / 100,
    events,
  };
}

function getISOWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to Monday (day 0 = Sunday -> shift back 6, else shift back day-1)
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export interface WeeklyDuration {
  week: string;
  hours: string;
}

export async function fetchWeeklyDurations(icalUrl: string): Promise<WeeklyDuration[]> {
  const rawEvents = await fetchRawEvents(icalUrl);

  const startDate = new Date("2021-03-08T00:00:00");
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 1);
  endDate.setHours(0, 0, 0, 0);

  const filtered = rawEvents.filter((e) => e.start >= startDate && e.start < endDate);

  const weeks = new Map<string, number>();
  for (const event of filtered) {
    const weekKey = getISOWeekMonday(event.start);
    const durationMs = getDurationMs(event.start, event.end);
    weeks.set(weekKey, (weeks.get(weekKey) || 0) + durationMs);
  }

  const result: WeeklyDuration[] = Array.from(weeks.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .reverse()
    .map(([week, ms]) => {
      const totalMinutes = Math.round(ms / 60000);
      const hours = totalMinutes / 60;
      return { week, hours: hours.toFixed(2) };
    });

  return result;
}

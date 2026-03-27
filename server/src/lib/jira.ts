function getJiraAuth() {
  const host = process.env.JIRA_HOST;
  const user = process.env.JIRA_USER;
  const pass = process.env.JIRA_PASS;
  if (!host || !user || !pass) throw new Error("Jira credentials not configured");
  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  return { host, auth };
}

const titleCache = new Map<string, string>();

export async function fetchJiraTitles(
  keys: string[]
): Promise<Record<string, string>> {
  const { host, auth } = getJiraAuth();

  const uncached = keys.filter((k) => !titleCache.has(k));
  const result: Record<string, string> = {};

  // Return cached titles immediately
  for (const key of keys) {
    const cached = titleCache.get(key);
    if (cached) result[key] = cached;
  }

  if (uncached.length === 0) return result;

  // Batch fetch via JQL search (v3 endpoint, migrated from deprecated /search)
  const jql = `key in (${uncached.join(",")})`;
  const params = new URLSearchParams({
    jql,
    fields: "summary",
    maxResults: String(uncached.length),
  });

  const response = await fetch(`${host}/rest/api/3/search/jql?${params}`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!response.ok) {
    console.error(`Jira search failed (${response.status})`);
    return result;
  }

  const data = await response.json();
  for (const issue of data.issues ?? []) {
    const title = issue.fields?.summary;
    if (title) {
      titleCache.set(issue.key, title);
      result[issue.key] = title;
    }
  }

  return result;
}

export async function createJiraWorklog(
  issueKey: string,
  duration: string,
  message?: string
): Promise<void> {
  const { host, auth } = getJiraAuth();
  const url = `${host}/rest/api/2/issue/${issueKey}/worklog`;

  const body: Record<string, string> = {
    started: new Date().toISOString().replace("Z", "+0000"),
    timeSpent: duration,
  };
  if (message) {
    body.comment = message;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API error (${response.status}): ${text}`);
  }
}

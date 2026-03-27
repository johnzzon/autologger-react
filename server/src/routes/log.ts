import { Router } from "express";
import { createJiraWorklog } from "../lib/jira.js";

export const logRouter = Router();

logRouter.post("/log", async (req, res) => {
  const { jira, duration, message } = req.body;

  if (!duration) {
    res.status(400).json({ error: "duration is required" });
    return;
  }

  if (!jira) {
    res.status(400).json({ error: "jira issue key is required" });
    return;
  }

  try {
    await createJiraWorklog(jira, duration, message);
    res.json({ results: [{ service: "jira", status: "success", message: `Worklog created for ${jira}.` }] });
  } catch (err) {
    res.json({ results: [{ service: "jira", status: "error", message: err instanceof Error ? err.message : String(err) }] });
  }
});

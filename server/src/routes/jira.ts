import { Router } from "express";
import { fetchJiraTitles } from "../lib/jira.js";

export const jiraRouter = Router();

jiraRouter.get("/jira/titles", async (req, res) => {
  const keysParam = req.query.keys as string;
  if (!keysParam) {
    res.status(400).json({ error: "keys parameter required" });
    return;
  }

  const keys = keysParam.split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    res.json({ titles: {} });
    return;
  }

  try {
    const titles = await fetchJiraTitles(keys);
    res.json({ titles });
  } catch (err) {
    console.error("Failed to fetch Jira titles:", err);
    res.status(500).json({ error: "Failed to fetch Jira titles" });
  }
});

import { Router } from "express";
import { fetchWeeklyDurations } from "../lib/events.js";

export const flexRouter = Router();

flexRouter.get("/flex", async (_req, res) => {
  const icalUrl = process.env.APP_ICAL_LINK;

  if (!icalUrl) {
    res.status(500).json({ error: "APP_ICAL_LINK not configured" });
    return;
  }

  try {
    const weeklyDurations = await fetchWeeklyDurations(icalUrl);
    res.json({ weeklyDurations });
  } catch (err) {
    console.error("Failed to fetch flex data:", err);
    res.status(500).json({ error: "Failed to fetch weekly durations" });
  }
});

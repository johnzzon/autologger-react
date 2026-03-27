import { Router } from "express";
import { fetchEventsForDate } from "../lib/events.js";

export const eventsRouter = Router();

eventsRouter.get("/events", async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const icalUrl = process.env.APP_ICAL_LINK;

  if (!icalUrl) {
    res.status(500).json({ error: "APP_ICAL_LINK not configured" });
    return;
  }

  try {
    const bust = req.query.refresh === "1";
    const data = await fetchEventsForDate(icalUrl, date, bust);
    res.json(data);
  } catch (err) {
    console.error("Failed to fetch events:", err);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

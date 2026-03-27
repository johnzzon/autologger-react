import { Router } from "express";

export const harvestRouter = Router();

harvestRouter.get("/harvest/projects", (_req, res) => {
  res.json({
    projects: [],
  });
});

import { config } from "dotenv";
config({ path: "../.env" });

import express from "express";
import cors from "cors";
import { eventsRouter } from "./routes/events.js";
import { flexRouter } from "./routes/flex.js";
import { logRouter } from "./routes/log.js";
import { harvestRouter } from "./routes/harvest.js";
import { jiraRouter } from "./routes/jira.js";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api", eventsRouter);
app.use("/api", flexRouter);
app.use("/api", logRouter);
app.use("/api", harvestRouter);
app.use("/api", jiraRouter);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

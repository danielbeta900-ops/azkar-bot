import app from "./app.js";
import { logger } from "./lib/logger.js";
import { initBot } from "./bot/index.js";

const port = Number(process.env["PORT"] ?? 10000);

app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
});

initBot();

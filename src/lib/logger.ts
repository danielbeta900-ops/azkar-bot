export const logger = {
  info: (data: unknown, msg?: string) => console.log("[INFO]", msg ?? "", data),
  error: (data: unknown, msg?: string) => console.error("[ERROR]", msg ?? "", data),
  warn: (data: unknown, msg?: string) => console.warn("[WARN]", msg ?? "", data),
};

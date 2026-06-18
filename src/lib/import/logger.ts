const PREFIX = "[import]";

export function importLog(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>
) {
  const payload = meta ? { message, ...meta } : message;
  if (level === "error") console.error(PREFIX, payload);
  else if (level === "warn") console.warn(PREFIX, payload);
  else console.log(PREFIX, payload);
}

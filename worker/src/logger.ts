/**
 * Structured JSON logging to stdout — one line per event (HLSA §22).
 * No dependency: a hosted log aggregator is explicitly deferred for the MVP.
 */

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, component: string, message: string, fields: Record<string, unknown> = {}) {
  const entry = {
    level,
    ts: new Date().toISOString(),
    component,
    message,
    ...fields,
  };
  const line = JSON.stringify(entry, (_key, value) =>
    value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value,
  );
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function createLogger(component: string) {
  return {
    debug: (message: string, fields?: Record<string, unknown>) => emit("debug", component, message, fields),
    info: (message: string, fields?: Record<string, unknown>) => emit("info", component, message, fields),
    warn: (message: string, fields?: Record<string, unknown>) => emit("warn", component, message, fields),
    error: (message: string, fields?: Record<string, unknown>) => emit("error", component, message, fields),
  };
}

export type Logger = ReturnType<typeof createLogger>;

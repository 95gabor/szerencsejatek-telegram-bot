import { context } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";

let installed = false;

/**
 * Installs OpenTelemetry's AsyncLocalStorage context manager so `context.active()`
 * propagates across async work (required for trace/span correlation in logs on Deno/Node).
 * Idempotent; call once before creating spans (e.g. at the start of `initObservability`).
 */
export function installOtelContextManager(): void {
  if (installed) return;
  const cm = new AsyncLocalStorageContextManager();
  cm.enable();
  context.setGlobalContextManager(cm);
  installed = true;
}

import { httpRequests, initObservability } from "./mod.ts";

Deno.test("observability: init without OTLP and noop metrics", () => {
  initObservability({ serviceName: "test", serviceVersion: "0" });
  httpRequests.add(1, { "http.route": "test" });
});

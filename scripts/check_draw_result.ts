/**
 * Triggers the draw pipeline on a running HTTP server: POST a
 * `dev.szerencsejatek.telegram.otoslotto.draw.update.requested.v1` CloudEvent to `POST /`
 * (same as Knative/Eventing would). Requires `deno task start` (or equivalent) listening.
 *
 * Env: uses `loadConfig()` — `PORT`, `GAME_ID`, and optional `.env`.
 * Override base URL: `PIPELINE_BASE_URL` (e.g. `https://example.com` — no trailing slash).
 */
import { loadConfig } from "../src/config/env.ts";
import { createCloudEvent } from "../src/events/cloudevents.ts";
import { EVENT_TYPE_DRAW_UPDATE_REQUESTED } from "../src/events/otoslotto_pipeline.ts";

const config = loadConfig();

const base = Deno.env.get("PIPELINE_BASE_URL")?.replace(/\/$/, "") ??
  `http://127.0.0.1:${config.PORT}`;
const url = `${base}/`;

const ce = createCloudEvent({
  id: crypto.randomUUID(),
  source: "script/check_draw_result",
  type: EVENT_TYPE_DRAW_UPDATE_REQUESTED,
  datacontenttype: "application/json",
  data: { gameId: config.GAME_ID },
});

const body = JSON.stringify(ce);

const res = await fetch(url, {
  method: "POST",
  headers: {
    "content-type": "application/cloudevents+json",
  },
  body,
});

const text = await res.text();
if (!res.ok) {
  console.error(`POST ${url} failed: ${res.status} ${res.statusText}`);
  console.error(text);
  Deno.exit(1);
}

// Success: 204 No Content when dispatch completes without error
console.log(`${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);

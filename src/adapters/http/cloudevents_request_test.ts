import { assertEquals } from "jsr:@std/assert@1/equals";
import { EVENT_TYPE_DRAW_UPDATE_REQUESTED } from "../../events/otoslotto_pipeline.ts";
import { GAME_ID_OTOSLOTTO } from "../../domain/otoslotto/mod.ts";
import { GAME_ID_EUROJACKPOT } from "../../domain/eurojackpot/mod.ts";
import { cloudEventFromHttpRequest } from "./cloudevents_request.ts";

Deno.test("cloudEventFromHttpRequest parses application/cloudevents+json", async () => {
  const body = JSON.stringify({
    specversion: "1.0",
    id: "id-1",
    source: "https://example.com/test",
    type: EVENT_TYPE_DRAW_UPDATE_REQUESTED,
    datacontenttype: "application/json",
    data: { gameId: GAME_ID_OTOSLOTTO },
  });
  const request = new Request("http://localhost/", {
    method: "POST",
    headers: { "content-type": "application/cloudevents+json" },
    body,
  });
  const event = await cloudEventFromHttpRequest(request);
  assertEquals(event.type, EVENT_TYPE_DRAW_UPDATE_REQUESTED);
  assertEquals((event.data as { gameId: string }).gameId, GAME_ID_OTOSLOTTO);
});

Deno.test("cloudEventFromHttpRequest keeps eurojackpot game id payload", async () => {
  const body = JSON.stringify({
    specversion: "1.0",
    id: "id-2",
    source: "https://example.com/test",
    type: EVENT_TYPE_DRAW_UPDATE_REQUESTED,
    datacontenttype: "application/json",
    data: { gameId: GAME_ID_EUROJACKPOT },
  });
  const request = new Request("http://localhost/", {
    method: "POST",
    headers: { "content-type": "application/cloudevents+json" },
    body,
  });
  const event = await cloudEventFromHttpRequest(request);
  assertEquals(event.type, EVENT_TYPE_DRAW_UPDATE_REQUESTED);
  assertEquals((event.data as { gameId: string }).gameId, GAME_ID_EUROJACKPOT);
});

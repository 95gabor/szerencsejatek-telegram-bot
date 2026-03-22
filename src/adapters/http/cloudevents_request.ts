import { HTTP } from "cloudevents";
import { type CloudEvent, CLOUDEVENTS_SPEC_VERSION } from "../../events/cloudevents.ts";

function headersRecord(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of request.headers.entries()) {
    out[key] = value;
  }
  return out;
}

export async function cloudEventFromHttpRequest(request: Request): Promise<CloudEvent<unknown>> {
  const body = await request.text();
  const parsed = HTTP.toEvent({ headers: headersRecord(request), body });
  const sdkEvent = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!sdkEvent) {
    throw new Error("empty CloudEvent");
  }
  return {
    specversion: CLOUDEVENTS_SPEC_VERSION,
    id: String(sdkEvent.id),
    source: String(sdkEvent.source),
    type: String(sdkEvent.type),
    time: sdkEvent.time,
    datacontenttype: sdkEvent.datacontenttype === "application/json"
      ? "application/json"
      : undefined,
    data: sdkEvent.data as unknown,
  };
}

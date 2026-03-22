import type { CloudEvent } from "../events/cloudevents.ts";

/** Dispatch the next CloudEvent in-process (queue/bus can replace later). */
export type EmitCloudEvent = (event: CloudEvent<unknown>) => Promise<void>;

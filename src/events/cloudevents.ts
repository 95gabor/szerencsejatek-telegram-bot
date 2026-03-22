/**
 * Subset of [CloudEvents v1.0.2](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md)
 * JSON encoding per [JSON event format](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/formats/json-format.md).
 * Used for internal domain events so future adapters (HTTP, queues) can map 1:1 to CNCF CloudEvents.
 */

export const CLOUDEVENTS_SPEC_VERSION = "1.0" as const;

export type CloudEvent<TData = unknown> = {
  specversion: typeof CLOUDEVENTS_SPEC_VERSION;
  id: string;
  /** URI reference identifying the context in which an event happened (e.g. `https://github.com/org/repo`). */
  source: string;
  /** Describes the type of the event (reverse-DNS recommended). */
  type: string;
  time?: string;
  datacontenttype?: "application/json";
  data?: TData;
};

export function createCloudEvent<TData>(
  partial: Omit<CloudEvent<TData>, "specversion">,
): CloudEvent<TData> {
  return {
    specversion: CLOUDEVENTS_SPEC_VERSION,
    ...partial,
  };
}

import { trace } from "@opentelemetry/api";
import type { CloudEvent } from "../events/cloudevents.ts";
import {
  isDrawResultPersistEvent,
  isDrawResultStoredEvent,
  isDrawUpdateRequestedEvent,
  isUserNotificationRequestedEvent,
} from "../events/pipeline.ts";
import { getLogger } from "../logging/mod.ts";
import { pipelineEvents } from "../observability/mod.ts";
import type { DrawResultFetcher } from "../ports/draw_result_fetcher.ts";
import type { EmitCloudEvent } from "../ports/event_emitter.ts";
import type { DrawRecordRepository, PlayedLineRepository } from "../ports/repositories.ts";
import type { Locale } from "../i18n/mod.ts";
import type { OutboundNotifier } from "../ports/outbound_notifier.ts";
import { handleDrawResultPersist } from "./handle_draw_result_persist.ts";
import { handleDrawResultStored } from "./handle_draw_result_stored.ts";
import { handleDrawUpdateRequested } from "./handle_draw_update_requested.ts";
import { handleUserNotificationRequested } from "./handle_user_notification_requested.ts";

const tracer = trace.getTracer("pipeline");

export type PipelineDeps = {
  emit: EmitCloudEvent;
  fetcher: DrawResultFetcher;
  draws: DrawRecordRepository;
  lines: PlayedLineRepository;
  notifier: OutboundNotifier;
  gameId: string;
  locale: Locale;
};

export type PipelineDepsWithoutEmit = Omit<PipelineDeps, "emit">;

/**
 * Routes CloudEvents through the draw pipeline (update → persist → stored → notification).
 */
export async function dispatchPipelineEvent(
  event: CloudEvent<unknown>,
  deps: PipelineDeps,
): Promise<void> {
  const eventType = event.type ?? "unknown";

  await tracer.startActiveSpan("pipeline.dispatch", async (span) => {
    const log = getLogger();
    span.setAttribute("cloudevents.type", eventType);
    pipelineEvents.add(1, { "event.type": eventType });

    try {
      if (isDrawUpdateRequestedEvent(event)) {
        log.info("pipeline.handler", {
          event_type: eventType,
          handler: "handleDrawUpdateRequested",
        });
        await handleDrawUpdateRequested(event, deps);
        return;
      }
      if (isDrawResultPersistEvent(event)) {
        log.info("pipeline.handler", { event_type: eventType, handler: "handleDrawResultPersist" });
        await handleDrawResultPersist(event, deps);
        return;
      }
      if (isDrawResultStoredEvent(event)) {
        log.info("pipeline.handler", { event_type: eventType, handler: "handleDrawResultStored" });
        await handleDrawResultStored(event, deps);
        return;
      }
      if (isUserNotificationRequestedEvent(event)) {
        log.info("pipeline.handler", {
          event_type: eventType,
          handler: "handleUserNotificationRequested",
        });
        await handleUserNotificationRequested(event, deps);
        return;
      }
      log.debug("pipeline.handler.unmatched", { event_type: eventType });
    } catch (err) {
      log.error("pipeline.handler.error", {
        event_type: eventType,
        error: err instanceof Error ? err.message : String(err),
      });
      span.recordException(err as Error);
      throw err;
    }
  });
}

/** Wires `emit` so each stage can enqueue follow-up events through the same router. */
export function createPipelineEmitter(
  baseDeps: PipelineDepsWithoutEmit,
): EmitCloudEvent {
  const emit: EmitCloudEvent = async (nextEvent) => {
    await dispatchPipelineEvent(nextEvent, { ...baseDeps, emit });
  };
  return emit;
}

import type { OutboundNotifier } from "../../ports/outbound_notifier.ts";

export class NoopOutboundNotifier implements OutboundNotifier {
  sendUserMessage(_input: { chatId: bigint; text: string }): Promise<void> {
    return Promise.resolve();
  }
}

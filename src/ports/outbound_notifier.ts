/** Outbound user notifications — implemented by Telegram today; Discord/others later. */
export interface OutboundNotifier {
  /** One message per logical notification (here: one per draw per user). */
  sendUserMessage(input: { chatId: bigint; text: string }): Promise<void>;
}

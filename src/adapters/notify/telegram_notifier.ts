import type { Bot } from "grammy";
import type { OutboundNotifier } from "../../ports/outbound_notifier.ts";

/** Sends draw notifications via Telegram Bot API (same bot instance as command handlers). */
export class TelegramOutboundNotifier implements OutboundNotifier {
  constructor(private readonly bot: Bot) {}

  async sendUserMessage(input: { chatId: bigint; text: string }): Promise<void> {
    await this.bot.api.sendMessage(input.chatId.toString(), input.text, {
      parse_mode: "HTML",
    });
  }
}

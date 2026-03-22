import type { Context } from "grammy";

/** Reply with Telegram HTML parse mode (lists, <code> for numbers, <b> for labels). */
export async function replyHtml(ctx: Context, text: string): Promise<void> {
  await ctx.reply(text, { parse_mode: "HTML" });
}

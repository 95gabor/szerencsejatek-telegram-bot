import { eq } from "npm:drizzle-orm@0.45.1";
import type { UserRepository } from "../../../ports/mod.ts";
import type { AppPostgresDatabase } from "./client.ts";
import { users } from "./schema.ts";

export class DrizzlePostgresUserRepository implements UserRepository {
  constructor(private readonly db: AppPostgresDatabase) {}

  async upsertUser(input: { telegramUserId: bigint; chatId: bigint }): Promise<{ id: string }> {
    const telegramUserId = input.telegramUserId.toString();
    const chatId = input.chatId.toString();

    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.telegramUserId, telegramUserId))
      .limit(1);

    if (existing.length > 0) {
      const id = existing[0]!.id;
      await this.db.update(users).set({ chatId }).where(eq(users.id, id));
      return { id };
    }

    const id = crypto.randomUUID();
    await this.db.insert(users).values({
      id,
      telegramUserId,
      chatId,
      createdAt: new Date(),
    });
    return { id };
  }
}

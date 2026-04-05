import { createAppDatabase as createLibsqlDatabase } from "./client.ts";
import { detectPersistenceBackend } from "./database_url.ts";
import { DrizzleDrawRecordRepository as DrizzleLibsqlDrawRecordRepository } from "./draw_record_repository.ts";
import { ensureSchema as ensureLibsqlSchema } from "./ensure_schema.ts";
import { DrizzlePlayedLineRepository as DrizzleLibsqlPlayedLineRepository } from "./played_line_repository.ts";
import { DrizzleUserRepository as DrizzleLibsqlUserRepository } from "./user_repository.ts";
import { createPostgresDatabase } from "../drizzle_postgres/client.ts";
import { DrizzlePostgresDrawRecordRepository } from "../drizzle_postgres/draw_record_repository.ts";
import { ensurePostgresSchema } from "../drizzle_postgres/ensure_schema.ts";
import { DrizzlePostgresPlayedLineRepository } from "../drizzle_postgres/played_line_repository.ts";
import { DrizzlePostgresUserRepository } from "../drizzle_postgres/user_repository.ts";
import type {
  DrawRecordRepository,
  PlayedLineRepository,
  UserRepository,
} from "../../../ports/mod.ts";

export type PersistenceBundle = {
  users: UserRepository;
  lines: PlayedLineRepository;
  draws: DrawRecordRepository;
};

/**
 * Build repositories for DATABASE_URL:
 * - postgres://... -> Drizzle postgres adapter
 * - file:/libsql:/https:/wss: -> Drizzle libsql adapter
 */
export async function createPersistenceBundle(databaseUrl: string): Promise<PersistenceBundle> {
  const backend = detectPersistenceBackend(databaseUrl);

  if (backend === "postgres") {
    await ensurePostgresSchema(databaseUrl);
    const db = createPostgresDatabase(databaseUrl);
    return {
      users: new DrizzlePostgresUserRepository(db),
      lines: new DrizzlePostgresPlayedLineRepository(db),
      draws: new DrizzlePostgresDrawRecordRepository(db),
    };
  }

  await ensureLibsqlSchema(databaseUrl);
  const db = createLibsqlDatabase(databaseUrl);
  return {
    users: new DrizzleLibsqlUserRepository(db),
    lines: new DrizzleLibsqlPlayedLineRepository(db),
    draws: new DrizzleLibsqlDrawRecordRepository(db),
  };
}

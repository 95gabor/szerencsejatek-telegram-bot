# Deno ≥2.3 reads lockfile version 5 (see deno.lock)
FROM denoland/deno:2.7.7

WORKDIR /app

COPY deno.json deno.lock ./
COPY src ./src
COPY scripts ./scripts

RUN deno cache --lock=deno.lock src/server.ts src/telegram_bot.ts scripts/check_draw_result.ts

ENV PORT=8080
EXPOSE 8080

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "--allow-ffi", "--allow-sys", "src/server.ts"]

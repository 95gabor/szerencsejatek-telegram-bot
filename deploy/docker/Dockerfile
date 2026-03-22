# Deno ≥2.3 reads lockfile version 5 (see deno.lock)
FROM denoland/deno:2.7.7

WORKDIR /app

COPY deno.json deno.lock ./
COPY src ./src

RUN deno cache --lock=deno.lock src/server.ts

ENV PORT=8080
EXPOSE 8080

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "--allow-ffi", "src/server.ts"]

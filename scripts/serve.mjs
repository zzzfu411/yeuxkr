import { createServer } from "node:http";
import next from "next";

const port = Number(process.env.PORT ?? process.env.KIRINA_PORT ?? "4173");
const host = process.env.HOST ?? "127.0.0.1";
const app = next({ dev: false, dir: process.cwd(), hostname: host, port });

await app.prepare();
const handler = app.getRequestHandler();
const server = createServer((request, response) => handler(request, response));
let closing = false;

server.on("error", (error) => {
  console.error(`Failed to start Kirina Korean preview: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Kirina Korean preview: http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => void shutdown(signal));
}

async function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`Stopping Kirina Korean preview (${signal})...`);
  await new Promise((resolve) => {
    server.close(() => resolve());
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
  });
  await app.close();
  process.exit(0);
}

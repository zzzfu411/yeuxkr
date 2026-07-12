import { spawn } from "node:child_process";

const port = process.env.PORT ?? process.env.KIRINA_PORT ?? "4173";
const host = process.env.HOST ?? "127.0.0.1";
const args = ["node_modules/next/dist/bin/next", "start", "--hostname", host, "--port", port];

const server = spawn(process.execPath, args, {
  stdio: "inherit",
  shell: false,
  env: {
    ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === "string")),
    KIRINA_URL: `http://${host}:${port}`
  }
});

server.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Kirina Korean preview stopped by ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});

server.on("error", (error) => {
  console.error(`Failed to start Kirina Korean preview: ${error.message}`);
  process.exit(1);
});

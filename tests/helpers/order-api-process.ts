import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Order } from "../../src/domain/order.js";

export interface ApiProcess {
  child: ChildProcess;
  url: string;
  pid: number;
}

export function startApiProcess(databaseUrl: string): Promise<ApiProcess> {
  const child = fork(fileURLToPath(new URL("../fixtures/idempotency-http-server.ts", import.meta.url)), {
    execArgv: ["--import", "tsx"],
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      child.off("message", ready);
      child.off("exit", earlyExit);
      child.off("error", failed);
    };
    const failed = (error: Error) => {
      cleanup();
      child.kill();
      reject(new Error("Fictional order API process could not start.", { cause: error }));
    };
    const earlyExit = (code: number | null) => failed(new Error(`API exited before readiness (${code}).`));
    const ready = (message: unknown) => {
      if (!message || typeof message !== "object" ||
          !("schema" in message) || message.schema !== "northstar/acceptance-server/1" ||
          !("url" in message) || typeof message.url !== "string" ||
          !/^http:\/\/127\.0\.0\.1:\d+$/.test(message.url) ||
          !("pid" in message) || typeof child.pid !== "number" ||
          message.pid !== child.pid) return;
      cleanup();
      resolve({ child, url: message.url, pid: child.pid });
    };
    const timeout = setTimeout(() => failed(new Error("API readiness deadline exceeded.")), 30_000);
    child.on("message", ready);
    child.once("exit", earlyExit);
    child.once("error", failed);
  });
}

export async function stopApiProcess(server: ApiProcess): Promise<void> {
  if (server.child.exitCode !== null || server.child.signalCode !== null) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      server.child.kill("SIGKILL");
      reject(new Error("API process teardown deadline exceeded."));
    }, 10_000);
    server.child.once("exit", () => { clearTimeout(timer); resolve(); });
    server.child.once("error", (error) => { clearTimeout(timer); reject(error); });
    server.child.kill("SIGTERM");
  });
}

export function assertOrder(body: unknown): asserts body is Order {
  if (!body || typeof body !== "object" ||
      !("id" in body) || typeof body.id !== "string" ||
      !("sku" in body) || typeof body.sku !== "string" ||
      !("quantity" in body) || typeof body.quantity !== "number" ||
      !("createdAt" in body) || typeof body.createdAt !== "string") {
    throw new Error("The API did not return the existing Order representation.");
  }
}

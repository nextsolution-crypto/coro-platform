#!/usr/bin/env node
import { startPrivateStorage } from "./private-storage.mjs";

const port = Number(process.env.PRIVATE_STORAGE_PORT || 34642);
const accessKey = process.env.PRIVATE_STORAGE_ACCESS_KEY || "";
if (!accessKey) throw new Error("PRIVATE_STORAGE_ACCESS_KEY is required");

const storage = await startPrivateStorage({
  port,
  host: "0.0.0.0",
  accessKey,
});

const stop = async () => {
  await storage.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
console.log("QA private storage ready on the isolated network.");

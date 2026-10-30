// Runs every hour: starts the backup queue at the Monday cutoff and hands off after 24h.
// (The API also advances on every visit, so this just keeps things moving when nobody opens the site.)
import { tick } from "../../lib/server.mjs";
import { blobStore } from "../../lib/blob-store.mjs";

export default async () => {
  await tick(blobStore());
};

export const config = { schedule: "@hourly" };

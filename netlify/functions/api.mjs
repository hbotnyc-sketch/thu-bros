import { handleRequest } from "../../lib/server.mjs";
import { blobStore } from "../../lib/blob-store.mjs";

export default async (req) => handleRequest(req, blobStore());

export const config = { path: "/api" };

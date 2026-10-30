// Netlify Blobs adapter. One JSON document holds the whole group's state.
import { getStore } from "@netlify/blobs";

const KEY = "state";

export function blobStore() {
  const store = getStore({ name: "sohbet", consistency: "strong" });
  return {
    async load() {
      const r = await store.getWithMetadata(KEY, { type: "json" });
      return r ? { data: r.data, etag: r.etag } : { data: null, etag: null };
    },
    async save(data, etag) {
      // Conditional write when supported, so two people tapping at once can't overwrite each other.
      const opts = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
      const r = await store.setJSON(KEY, data, opts);
      return !(r && r.modified === false);
    },
  };
}

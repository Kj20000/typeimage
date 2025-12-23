import { openDB } from "idb";

export const imageDB = openDB("typeimage-files", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("images")) {
      db.createObjectStore("images");
    }
  },
});

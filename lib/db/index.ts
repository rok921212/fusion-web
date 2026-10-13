import "server-only";
import { MongoClient, type Db } from "mongodb";
import { ensureIndexes } from "./schema";

// One client per server process. In development the module is re-evaluated on
// every change, so the client is kept on globalThis to avoid leaking
// connections.
const globalForMongo = globalThis as unknown as {
  mongo?: { client: MongoClient; ready: Promise<Db> };
};

function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local.");
  }
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
  });
  const db = client.db(process.env.MONGODB_DB || "fusion");
  const ready = ensureIndexes(db).then(() => db);
  // Let the next call retry instead of caching a failed connection.
  ready.catch(() => {
    if (globalForMongo.mongo?.client === client) globalForMongo.mongo = undefined;
  });
  return { client, ready };
}

export function getDb(): Promise<Db> {
  globalForMongo.mongo ??= connect();
  return globalForMongo.mongo.ready;
}

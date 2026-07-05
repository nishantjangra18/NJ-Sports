import mongoose from "mongoose";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache = globalForMongoose.mongooseCache ?? { connection: null, promise: null };
globalForMongoose.mongooseCache = cache;

export async function connectMongoDB() {
  if (cache.connection) return cache.connection;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false
    }).then((connection) => {
      console.info("[mongodb] connected");
      return connection;
    }).catch((error) => {
      cache.promise = null;
      console.error("[mongodb] connection failed", error);
      throw error;
    });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}
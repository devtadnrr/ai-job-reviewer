import Redis from "ioredis";

// BullMQ requires maxRetriesPerRequest to be null
export const redis = new Redis(process.env.REDIS_URL ?? "", {
  maxRetriesPerRequest: null,
});

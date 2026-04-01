const logger = require('../utils/logger');

let redisClient = null;
const memoryCache = new Map();

const initRedis = async () => {
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not set — using in-memory cache (not suitable for multi-instance)');
    return;
  }
  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));
    await redisClient.connect();
    logger.info('Redis connected');
  } catch (err) {
    logger.warn(`Redis unavailable, falling back to in-memory cache: ${err.message}`);
    redisClient = null;
  }
};

const get = async (key) => {
  if (redisClient) {
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memoryCache.delete(key); return null; }
  return entry.value;
};

const set = async (key, value, ttlSeconds = 300) => {
  if (redisClient) {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } else {
    memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
};

const del = async (key) => {
  if (redisClient) await redisClient.del(key);
  else memoryCache.delete(key);
};

// Token blocklist for revocation
const blockToken = async (jti, ttlSeconds) => set(`blocked:${jti}`, 1, ttlSeconds);
const isTokenBlocked = async (jti) => !!(await get(`blocked:${jti}`));

module.exports = { initRedis, get, set, del, blockToken, isTokenBlocked };

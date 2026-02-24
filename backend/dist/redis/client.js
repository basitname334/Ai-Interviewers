"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_TTL_SECONDS = void 0;
exports.getRedis = getRedis;
exports.sessionKey = sessionKey;
exports.contextKey = contextKey;
exports.closeRedis = closeRedis;
/**
 * Redis client for session state and context. Used by InterviewSessionService
 * to store live interview state. When REDIS_URL is empty or "memory", uses
 * in-memory store so the app runs without Redis (e.g. local dev).
 */
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const KEY_PREFIX = 'ai_interview:';
function createMemoryStore() {
    const store = new Map();
    return {
        async get(key) {
            const entry = store.get(key);
            if (!entry)
                return null;
            if (Date.now() > entry.expiryTs) {
                store.delete(key);
                return null;
            }
            return entry.value;
        },
        async setex(key, seconds, value) {
            store.set(key, { value, expiryTs: Date.now() + seconds * 1000 });
            return 'OK';
        },
        async expire(key, seconds) {
            const entry = store.get(key);
            if (entry)
                entry.expiryTs = Date.now() + seconds * 1000;
            return 1;
        },
    };
}
let client = null;
const LOCALHOST_REDIS = 'redis://localhost:6379';
function getRedis() {
    if (!client) {
        const url = (config_1.config.redis.url || '').trim();
        const urlLower = url.toLowerCase();
        // Use in-memory when Redis is disabled or when using default localhost URL (Redis often not running in dev).
        if (urlLower === '' || urlLower === 'memory' || url === LOCALHOST_REDIS || urlLower === LOCALHOST_REDIS) {
            console.log('Using in-memory store for session state (no Redis). Set REDIS_URL to a running Redis to use it.');
            client = createMemoryStore();
        }
        else {
            const r = new ioredis_1.default(config_1.config.redis.url, {
                maxRetriesPerRequest: 3,
                retryStrategy(times) {
                    return Math.min(times * 100, 3000);
                },
            });
            r.on('error', (err) => {
                console.error('Redis error', err);
            });
            client = r;
        }
    }
    return client;
}
function sessionKey(interviewId) {
    return `${KEY_PREFIX}session:${interviewId}`;
}
function contextKey(interviewId) {
    return `${KEY_PREFIX}context:${interviewId}`;
}
/** TTL for session keys (e.g. 4 hours for a long interview) */
exports.SESSION_TTL_SECONDS = 4 * 60 * 60;
async function closeRedis() {
    if (client && 'quit' in client && typeof client.quit === 'function') {
        await client.quit();
    }
    client = null;
}
//# sourceMappingURL=client.js.map
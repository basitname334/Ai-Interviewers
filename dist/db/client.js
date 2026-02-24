"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.query = query;
exports.closePool = closePool;
/**
 * PostgreSQL client singleton. For scale, use a connection pool (e.g. pg.Pool)
 * and consider read replicas for report reads.
 */
const pg_1 = require("pg");
const config_1 = require("../config");
let pool = null;
function getPool() {
    if (!pool) {
        pool = new pg_1.Pool({
            connectionString: config_1.config.database.url,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
        pool.on('error', (err) => {
            console.error('Unexpected DB pool error', err);
        });
    }
    return pool;
}
async function query(text, params) {
    const client = getPool();
    const result = await client.query(text, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
}
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
//# sourceMappingURL=client.js.map
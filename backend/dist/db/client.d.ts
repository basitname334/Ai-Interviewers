/**
 * PostgreSQL client singleton. For scale, use a connection pool (e.g. pg.Pool)
 * and consider read replicas for report reads.
 */
import { Pool } from 'pg';
export declare function getPool(): Pool;
export declare function query<T = unknown>(text: string, params?: unknown[]): Promise<{
    rows: T[];
    rowCount: number;
}>;
export declare function closePool(): Promise<void>;
//# sourceMappingURL=client.d.ts.map
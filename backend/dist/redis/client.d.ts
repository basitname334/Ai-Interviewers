/** Minimal interface used by InterviewSessionService */
export type RedisLike = {
    get(key: string): Promise<string | null>;
    setex(key: string, seconds: number, value: string): Promise<string>;
    expire(key: string, seconds: number): Promise<number>;
};
export declare function getRedis(): RedisLike;
export declare function sessionKey(interviewId: string): string;
export declare function contextKey(interviewId: string): string;
/** TTL for session keys (e.g. 4 hours for a long interview) */
export declare const SESSION_TTL_SECONDS: number;
export declare function closeRedis(): Promise<void>;
//# sourceMappingURL=client.d.ts.map
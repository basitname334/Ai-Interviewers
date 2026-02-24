/**
 * JWT auth middleware. Protects recruiter/dashboard routes. Interview answer
 * submission can use a short-lived token or session id for the candidate.
 */
import { Request, Response, NextFunction } from 'express';
export interface JwtPayload {
    sub: string;
    email?: string;
    type?: 'recruiter' | 'candidate' | 'admin';
    interviewId?: string;
    userId?: string;
    candidateId?: string;
    role?: 'admin' | 'recruiter';
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
/** Requires JWT with type === 'admin'. */
export declare function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void;
/** Requires JWT with type === 'recruiter'. */
export declare function recruiterAuthMiddleware(req: Request, res: Response, next: NextFunction): void;
/** Requires JWT with type === 'candidate'. */
export declare function candidateAuthMiddleware(req: Request, res: Response, next: NextFunction): void;
/** Optional auth: attach user if token present, don't reject. */
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map
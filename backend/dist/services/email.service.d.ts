export declare function sendInterviewScheduleEmail(input: {
    to: string;
    candidateName?: string | null;
    recruiterName?: string | null;
    role: string;
    scheduledAt: string;
    joinUrl: string;
    message?: string;
}): Promise<{
    sent: boolean;
    error?: string;
}>;
//# sourceMappingURL=email.service.d.ts.map
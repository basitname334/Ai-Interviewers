export declare const config: {
    readonly env: string;
    readonly port: number;
    readonly apiPrefix: string;
    readonly jwt: {
        readonly secret: string;
        readonly expiresIn: string;
    };
    readonly database: {
        readonly url: string;
    };
    readonly redis: {
        readonly url: string;
    };
    readonly ai: {
        readonly openaiApiKey: string;
        readonly anthropicApiKey: string;
        /** Open Router API key – used for interviewer (role-based questions) when set. https://openrouter.ai */
        readonly openRouterApiKey: string;
        /** AICC API key – optional, for voice/TTS or other services when set. */
        readonly aiccApiKey: string;
        /** Open Router model (e.g. openai/gpt-4o, anthropic/claude-3-haiku). */
        readonly openRouterModel: string;
        readonly defaultTemperature: 0.4;
        readonly maxContextTokens: 12000;
    };
    readonly storage: {
        readonly endpoint: string | undefined;
        readonly bucket: string;
        readonly accessKey: string | undefined;
        readonly secretKey: string | undefined;
    };
    readonly vectorDb: {
        readonly url: string | undefined;
    };
    readonly admin: {
        readonly email: string;
        readonly password: string;
    };
    /** Base URL of the frontend (for join links). No trailing slash. */
    readonly frontendUrl: string;
    readonly mail: {
        readonly service: string;
        readonly host: string;
        readonly port: number;
        readonly secure: boolean;
        readonly user: string;
        readonly pass: string;
        readonly from: string;
        readonly replyTo: string;
    };
};
//# sourceMappingURL=index.d.ts.map
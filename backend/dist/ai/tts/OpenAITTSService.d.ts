import type { ITTSService } from './types';
export declare class OpenAITTSService implements ITTSService {
    private openai;
    constructor();
    synthesize(text: string): Promise<Buffer>;
}
//# sourceMappingURL=OpenAITTSService.d.ts.map
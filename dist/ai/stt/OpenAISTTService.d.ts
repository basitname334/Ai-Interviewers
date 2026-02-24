import type { ISTTService } from './types';
export declare class OpenAISTTService implements ISTTService {
    private openai;
    constructor();
    transcribe(audioBuffer: Buffer): Promise<string>;
}
//# sourceMappingURL=OpenAISTTService.d.ts.map
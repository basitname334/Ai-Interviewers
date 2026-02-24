import type { InterviewRole, InterviewPhase, DifficultyLevel } from '../types';
export interface QuestionTemplateRow {
    id: string;
    role: string;
    phase: string;
    difficulty: string;
    text: string;
    competency_ids: string[];
    follow_up_prompt: string | null;
    is_coding_question?: boolean;
    starter_code?: string | null;
    language?: string | null;
    sort_order?: number;
}
export interface QuestionTemplateCreate {
    role: InterviewRole;
    phase: InterviewPhase;
    difficulty: DifficultyLevel;
    text: string;
    competencyIds?: string[];
    followUpPrompt?: string | null;
    isCodingQuestion?: boolean;
    starterCode?: string | null;
    language?: string | null;
    sortOrder?: number;
}
export interface QuestionTemplateUpdate {
    phase?: InterviewPhase;
    difficulty?: DifficultyLevel;
    text?: string;
    competencyIds?: string[];
    followUpPrompt?: string | null;
    isCodingQuestion?: boolean;
    starterCode?: string | null;
    language?: string | null;
    sortOrder?: number;
}
export declare function listQuestionTemplates(filters?: {
    role?: string;
    phase?: string;
}): Promise<QuestionTemplateRow[]>;
export declare function createQuestionTemplate(data: QuestionTemplateCreate): Promise<QuestionTemplateRow>;
export declare function updateQuestionTemplate(id: string, data: QuestionTemplateUpdate): Promise<QuestionTemplateRow | null>;
export declare function deleteQuestionTemplate(id: string): Promise<boolean>;
export declare function getQuestionTemplatesForStrategy(role: InterviewRole, phase: InterviewPhase): Promise<QuestionTemplateRow[]>;
//# sourceMappingURL=questionTemplate.service.d.ts.map
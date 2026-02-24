"use strict";
/**
 * Question Strategy Engine: role-based question selection, difficulty scaling,
 * follow-up logic, and topic coverage. Loads from question_templates (admin-added)
 * with fallback to in-memory demo bank.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionStrategyEngine = exports.QuestionStrategyEngine = exports.DEMO_QUESTIONS = void 0;
const questionTemplate_service_1 = require("../questionTemplate.service");
/** Fallback when no questions in DB. Exposed for evaluation engine. */
exports.DEMO_QUESTIONS = [
    { id: 'intro-1', role: 'technical', phase: 'intro', difficulty: 'easy', text: 'Hello! Thank you for joining today. Can you tell me a bit about your background and what drew you to this role?', competencyIds: ['communication'] },
    { id: 'tech-1', role: 'technical', phase: 'technical', difficulty: 'medium', text: 'Describe a technical challenge you recently solved. What was your approach and outcome?', competencyIds: ['problem_solving', 'technical_depth'] },
    { id: 'tech-2', role: 'technical', phase: 'technical', difficulty: 'medium', text: 'How do you balance shipping quickly with maintaining code quality?', competencyIds: ['technical_depth', 'judgment'] },
    { id: 'tech-follow', role: 'technical', phase: 'technical', difficulty: 'medium', text: 'Could you go into more detail about the trade-offs you considered?', competencyIds: ['technical_depth'], followUpPrompt: 'When answer is vague on trade-offs' },
    { id: 'beh-1', role: 'technical', phase: 'behavioral', difficulty: 'medium', text: 'Tell me about a time you had to collaborate with a difficult stakeholder. How did you handle it?', competencyIds: ['collaboration', 'communication'] },
    { id: 'wrap-1', role: 'technical', phase: 'wrap_up', difficulty: 'easy', text: 'Do you have any questions for us about the role or the team?', competencyIds: ['engagement'] },
];
function rowToTemplate(row) {
    return {
        id: row.id,
        role: row.role,
        phase: row.phase,
        difficulty: row.difficulty,
        text: row.text,
        competencyIds: row.competency_ids ?? [],
        followUpPrompt: row.follow_up_prompt ?? undefined,
    };
}
class QuestionStrategyEngine {
    fallbackQuestionFor(role, phase) {
        const roleLabel = role.replace(/_/g, ' ');
        const textByPhase = {
            intro: `Tell me a bit about your background and what interests you about this ${roleLabel} role.`,
            technical: 'Walk me through a recent challenge you faced and how you solved it.',
            behavioral: 'Tell me about a time you handled a difficult situation with a teammate or stakeholder.',
            wrap_up: 'Do you have any questions for me about the role or team?',
        };
        return {
            questionText: textByPhase[phase],
            questionId: `fallback-${role}-${phase}`,
            phase,
            difficulty: phase === 'intro' || phase === 'wrap_up' ? 'easy' : 'medium',
            competencyIds: ['communication'],
            isFollowUp: false,
            isCodingQuestion: false,
            starterCode: null,
            language: null,
        };
    }
    getPhaseOrder() {
        return ['intro', 'technical', 'behavioral', 'wrap_up'];
    }
    nextPhase(current) {
        const order = this.getPhaseOrder();
        const i = order.indexOf(current);
        return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
    }
    /** Load questions for role/phase from DB; fallback to DEMO_QUESTIONS. */
    async getQuestionsForRoleAndPhase(role, phase) {
        try {
            const rows = await (0, questionTemplate_service_1.getQuestionTemplatesForStrategy)(role, phase);
            if (rows.length > 0)
                return rows.map((r) => rowToTemplate(r));
        }
        catch (_) { }
        return exports.DEMO_QUESTIONS.filter((q) => q.role === role && q.phase === phase);
    }
    async getNextQuestion(input) {
        const { state, requestFollowUp, forceNextPhase } = input;
        let phase = state.phase;
        const lastTurn = state.turns.length > 0 ? state.turns[state.turns.length - 1] : null;
        const lastQuestionId = lastTurn?.role === 'ai' ? lastTurn.questionId : null;
        if (forceNextPhase) {
            const next = this.nextPhase(phase);
            if (next)
                phase = next;
        }
        if (phase === 'technical' && state.customQuestions && state.customQuestions.length > 0) {
            const uncoveredCustom = state.customQuestions
                .map((q, idx) => ({ id: `custom-${idx}`, ...q }))
                .filter((q) => !state.topicCoverage[q.id]);
            if (uncoveredCustom.length > 0) {
                const byDifficulty = uncoveredCustom.filter((q) => q.difficulty === state.currentDifficulty);
                const custom = (byDifficulty.length > 0 ? byDifficulty : uncoveredCustom)[0];
                return {
                    questionText: custom.text,
                    questionId: custom.id,
                    phase,
                    difficulty: custom.difficulty,
                    competencyIds: custom.isCodingQuestion ? ['technical_depth', 'problem_solving'] : ['communication'],
                    isFollowUp: false,
                    isCodingQuestion: custom.isCodingQuestion ?? false,
                    starterCode: custom.starterCode ?? null,
                    language: custom.language ?? null,
                };
            }
        }
        const candidates = await this.getQuestionsForRoleAndPhase(state.role, phase);
        if (candidates.length === 0) {
            return this.fallbackQuestionFor(state.role, phase);
        }
        const allForFollowUp = [...candidates, ...exports.DEMO_QUESTIONS.filter((q) => q.role === state.role)];
        if (requestFollowUp && lastQuestionId) {
            const lastQ = allForFollowUp.find((q) => q.id === lastQuestionId || lastQuestionId === q.id + '-follow');
            if (lastQ?.followUpPrompt) {
                return {
                    questionText: lastQ.text,
                    questionId: (lastQ.id.replace(/-follow$/, '') || lastQ.id) + '-follow',
                    phase,
                    difficulty: lastQ.difficulty,
                    competencyIds: lastQ.competencyIds,
                    isFollowUp: true,
                };
            }
        }
        const uncovered = candidates.filter((q) => !state.topicCoverage[q.id]);
        const pool = uncovered.length > 0 ? uncovered : candidates;
        const byDifficulty = pool.filter((q) => q.difficulty === state.currentDifficulty);
        const choice = (byDifficulty.length > 0 ? byDifficulty : pool)[0];
        if (!choice) {
            const nextPh = this.nextPhase(phase);
            if (nextPh)
                return this.getNextQuestion({ ...input, state: { ...state, phase: nextPh }, forceNextPhase: false });
            return this.fallbackQuestionFor(state.role, phase);
        }
        const row = await (0, questionTemplate_service_1.getQuestionTemplatesForStrategy)(state.role, phase).then((rows) => rows.find((r) => r.id === choice.id)).catch(() => null);
        return {
            questionText: choice.text,
            questionId: choice.id,
            phase,
            difficulty: choice.difficulty,
            competencyIds: choice.competencyIds,
            isFollowUp: false,
            isCodingQuestion: row?.is_coding_question ?? false,
            starterCode: row?.starter_code ?? null,
            language: row?.language ?? null,
        };
    }
    getCompetencyIdsForQuestionId(questionId, role) {
        const baseId = questionId.replace(/-follow$/, '');
        const q = exports.DEMO_QUESTIONS.find((x) => x.id === baseId);
        if (q)
            return q.competencyIds;
        return ['communication'];
    }
    async getFirstQuestion(role) {
        const introList = await this.getQuestionsForRoleAndPhase(role, 'intro');
        const intro = introList[0];
        if (!intro)
            return this.fallbackQuestionFor(role, 'intro');
        const rows = await (0, questionTemplate_service_1.getQuestionTemplatesForStrategy)(role, 'intro').catch(() => []);
        const row = rows.find((r) => r.id === intro.id);
        return {
            questionText: intro.text,
            questionId: intro.id,
            phase: 'intro',
            difficulty: 'easy',
            competencyIds: intro.competencyIds,
            isFollowUp: false,
            isCodingQuestion: row?.is_coding_question ?? false,
            starterCode: row?.starter_code ?? null,
            language: row?.language ?? null,
        };
    }
}
exports.QuestionStrategyEngine = QuestionStrategyEngine;
exports.questionStrategyEngine = new QuestionStrategyEngine();
//# sourceMappingURL=QuestionStrategyEngine.js.map
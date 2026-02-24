"use strict";
/**
 * AI Interviewer Orchestrator: ties together session, conversation, question
 * strategy, LLM, and evaluation. One entry point for "get next AI reply" and
 * "submit candidate answer". Ensures turn-based flow, evaluates answers, and
 * selects next question (or follow-up). Designed so the API and Socket.io
 * handlers only need to call this instead of each service separately.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiInterviewerOrchestrator = exports.AIInterviewerOrchestrator = void 0;
const llm_1 = require("../../ai/llm");
const prompts_1 = require("../../ai/prompts");
const InterviewSessionService_1 = require("./InterviewSessionService");
const ConversationManager_1 = require("./ConversationManager");
const QuestionStrategyEngine_1 = require("./QuestionStrategyEngine");
const EvaluationEngine_1 = require("./EvaluationEngine");
const ScoringReportService_1 = require("./ScoringReportService");
class AIInterviewerOrchestrator {
    roleLabel(role) {
        switch (role) {
            case 'customer_success':
                return 'customer success';
            default:
                return role.replace(/_/g, ' ');
        }
    }
    withGreetingIfFirstTurn(state, reply) {
        const trimmed = (reply || '').trim();
        if (state.turns.length > 0)
            return trimmed;
        if (!trimmed) {
            return `Hello! Welcome to this ${this.roleLabel(state.role)} interview. Let's get started.`;
        }
        const alreadyGreeting = /^(hi|hello|welcome)\b/i.test(trimmed);
        if (alreadyGreeting)
            return trimmed;
        return `Hello! Welcome to this ${this.roleLabel(state.role)} interview. ${trimmed}`;
    }
    /**
     * Submit candidate answer: evaluate it, append turns, decide follow-up vs next
     * question, and return next AI reply. If interview is at end, generate report.
     */
    async submitAnswer(input) {
        const state = await InterviewSessionService_1.interviewSessionService.getState(input.interviewId);
        if (!state) {
            return { success: false, state: null };
        }
        const lastTurn = state.turns.length > 0 ? state.turns[state.turns.length - 1] : null;
        if (!lastTurn || lastTurn.role !== 'ai') {
            return { success: false, state: null };
        }
        const lastAiTurn = [...state.turns].reverse().find((t) => t.role === 'ai');
        const lastQuestionText = lastAiTurn?.content ?? '';
        const lastQuestionId = lastAiTurn?.questionId;
        const competencyIds = lastQuestionId
            ? QuestionStrategyEngine_1.questionStrategyEngine.getCompetencyIdsForQuestionId(lastQuestionId)
            : ['communication'];
        const evaluation = await EvaluationEngine_1.evaluationEngine.evaluate({
            question: lastQuestionText,
            answer: input.answerText,
            competencyIds: competencyIds.length ? competencyIds : ['communication'],
        });
        const candidateTurn = ConversationManager_1.conversationManager.createTurn('candidate', input.answerText, {
            evaluation,
        });
        await InterviewSessionService_1.interviewSessionService.appendTurn(input.interviewId, candidateTurn, {
            topicCoverage: lastQuestionId ? { [lastQuestionId]: true } : undefined,
        });
        const updatedState = await InterviewSessionService_1.interviewSessionService.getState(input.interviewId);
        if (!updatedState)
            return { success: true, state: null, evaluation: { score: evaluation.score, maxScore: evaluation.maxScore } };
        const requestFollowUp = evaluation.normalizedScore < 0.5 || input.answerText.length < 50;
        const next = await QuestionStrategyEngine_1.questionStrategyEngine.getNextQuestion({
            state: updatedState,
            requestFollowUp,
        });
        if (!next) {
            const report = ScoringReportService_1.scoringReportService.buildReport({ ...updatedState, endedAt: new Date().toISOString() });
            await InterviewSessionService_1.interviewSessionService.end(input.interviewId, report);
            return {
                success: true,
                state: updatedState,
                nextReply: 'Thank you for your time today. That concludes our interview. You will receive feedback shortly.',
                evaluation: { score: evaluation.score, maxScore: evaluation.maxScore },
                report,
            };
        }
        const aiReply = await this.getNextReplyInternal(updatedState, next.questionText, next.questionId, next.phase, lastQuestionText, input.answerText);
        const aiTurn = ConversationManager_1.conversationManager.createTurn('ai', aiReply, {
            questionId: next.questionId,
            codingStarterCode: next.starterCode ?? undefined,
            codingLanguage: next.language ?? undefined,
            isCodingQuestion: next.isCodingQuestion ?? false,
        });
        await InterviewSessionService_1.interviewSessionService.appendTurn(input.interviewId, aiTurn, {
            phase: next.phase,
            currentDifficulty: next.difficulty,
        });
        const finalState = await InterviewSessionService_1.interviewSessionService.getState(input.interviewId);
        return {
            success: true,
            state: finalState ?? updatedState,
            nextReply: aiReply,
            evaluation: { score: evaluation.score, maxScore: evaluation.maxScore },
        };
    }
    /**
     * Get the next AI reply (e.g. first greeting or after phase change). Does not
     * append a candidate turn; use this for "start interview" or when advancing phase.
     */
    async getNextReply(input) {
        const state = await InterviewSessionService_1.interviewSessionService.getState(input.interviewId);
        if (!state) {
            return { success: false, state: null, reply: '' };
        }
        const next = state.turns.length === 0
            ? await QuestionStrategyEngine_1.questionStrategyEngine.getFirstQuestion(state.role)
            : await QuestionStrategyEngine_1.questionStrategyEngine.getNextQuestion({
                state,
                forceNextPhase: input.forceNextPhase,
            });
        if (!next) {
            return { success: false, state, reply: '' };
        }
        const rawReply = await this.getNextReplyInternal(state, next.questionText, next.questionId, next.phase);
        const reply = this.withGreetingIfFirstTurn(state, rawReply);
        const aiTurn = ConversationManager_1.conversationManager.createTurn('ai', reply, {
            questionId: next.questionId,
            codingStarterCode: next.starterCode ?? undefined,
            codingLanguage: next.language ?? undefined,
            isCodingQuestion: next.isCodingQuestion ?? false,
        });
        await InterviewSessionService_1.interviewSessionService.appendTurn(input.interviewId, aiTurn, {
            phase: next.phase,
            currentDifficulty: next.difficulty,
        });
        const updatedState = await InterviewSessionService_1.interviewSessionService.getState(input.interviewId);
        return {
            success: true,
            state: updatedState ?? state,
            reply,
            questionId: next.questionId,
            phase: next.phase,
        };
    }
    async getNextReplyInternal(state, questionText, questionId, phase, lastQuestionAsked, lastCandidateAnswer) {
        const context = ConversationManager_1.conversationManager.buildContext(state);
        const resumeContextBlock = state.resumeContext
            ? `\nCandidate resume/profile context:\n${state.resumeContext}\n\nUse this context to personalize your question phrasing, probe deeper into resume claims, and keep questions relevant to the candidate background.`
            : '';
        const focusAreasBlock = state.focusAreas
            ? `\nInterview focus areas / subject (set by recruiter): ${state.focusAreas}. Prioritize questions and topics related to these areas when relevant.`
            : '';
        const durationBlock = state.durationMinutes
            ? `\nInterview duration: ${state.durationMinutes} minutes. Keep questions focused and allow time for wrap-up.`
            : '';
        const systemContent = prompts_1.SYSTEM_PROMPT_INTERVIEWER.replace('{{phase}}', state.phase)
            .replace('{{role}}', state.role) +
            resumeContextBlock +
            focusAreasBlock +
            durationBlock +
            (context.priorSummary ? '\n' + (0, prompts_1.buildInterviewerContext)(context.priorSummary) : '');
        const answerSnippet = lastCandidateAnswer ? lastCandidateAnswer.slice(0, 800).trim() : '';
        const questionSnippet = lastQuestionAsked ? lastQuestionAsked.slice(0, 300).trim() : '';
        let userInstruction;
        if (answerSnippet && questionSnippet) {
            userInstruction = `The interviewer asked: "${questionSnippet}"

The candidate answered: "${answerSnippet}"

Analyze the candidate's answer. Your reply must: (1) Show you understood by referencing or reflecting something specific they said. (2) Then ask the next question; you may rephrase it to connect to their answer. Next question to ask (topic/intent): ${questionText}`;
        }
        else if (answerSnippet) {
            userInstruction = `The candidate just said: "${answerSnippet}". Analyze their answer. Reference something specific they said, then ask the next question. Next question to ask: ${questionText}`;
        }
        else {
            userInstruction = `Next question to ask: ${questionText}`;
        }
        const messages = [
            { role: 'system', content: systemContent },
            ...context.messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userInstruction },
        ];
        const llm = (0, llm_1.getLLMService)();
        const response = await llm.chat(messages, { temperature: 0.4, maxTokens: 320, timeoutMs: 10000 });
        const raw = (response.content || '').replace(/```json?\s*/g, '').trim();
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed.reply === 'string' && parsed.reply.length > 0)
                return parsed.reply;
        }
        catch {
            // LLM returned plain text instead of JSON; use it as the reply if it looks like speech
            if (raw.length > 15 && !raw.startsWith('{'))
                return raw;
        }
        return questionText;
    }
    /**
     * Generate report for a completed interview (e.g. from GET /report/:id).
     */
    async getReport(interviewId) {
        const state = await InterviewSessionService_1.interviewSessionService.getState(interviewId);
        if (!state)
            return null;
        return ScoringReportService_1.scoringReportService.buildReport({
            ...state,
            endedAt: state.endedAt ?? new Date().toISOString(),
        });
    }
}
exports.AIInterviewerOrchestrator = AIInterviewerOrchestrator;
exports.aiInterviewerOrchestrator = new AIInterviewerOrchestrator();
//# sourceMappingURL=AIInterviewerOrchestrator.js.map
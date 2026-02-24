"use strict";
/**
 * LLM abstraction: provider-agnostic interface so we can swap OpenAI/Claude
 * or add fallbacks without changing callers. All prompts request structured JSON
 * and use temperature 0.3–0.5; internal reasoning is never exposed to candidates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map
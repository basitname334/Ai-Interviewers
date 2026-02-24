"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureScheduledTable = ensureScheduledTable;
/**
 * Ensure scheduled_interviews table exists by running schema-scheduled.sql.
 * Called on server startup so the table is created without a separate migration step.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const client_1 = require("./client");
async function ensureScheduledTable() {
    const sqlPath = path.join(__dirname, 'schema-scheduled.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    // node-pg does not support multiple statements in one query; run each statement.
    const blocks = sql.split(/\n\s*\n/).map((block) => block
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim());
    for (const block of blocks) {
        if (!block)
            continue;
        const statements = block.split(';').map((s) => s.trim()).filter(Boolean);
        for (const stmt of statements) {
            await (0, client_1.query)(stmt + ';');
        }
    }
    // Keep older databases compatible with recruiter ownership.
    await (0, client_1.query)(`
    ALTER TABLE scheduled_interviews
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
  `);
    await (0, client_1.query)(`
    ALTER TABLE scheduled_interviews
    ADD COLUMN IF NOT EXISTS preferred_difficulty VARCHAR(10);
  `);
    await (0, client_1.query)(`
    ALTER TABLE scheduled_interviews
    ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]'::jsonb;
  `);
}
//# sourceMappingURL=ensure-scheduled.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUsersTable = ensureUsersTable;
const client_1 = require("./client");
async function ensureUsersTable() {
    await (0, client_1.query)(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
    await (0, client_1.query)(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'recruiter';
  `);
    await (0, client_1.query)(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
  `);
    await (0, client_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);
    await (0, client_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
  `);
}
//# sourceMappingURL=ensure-users.js.map
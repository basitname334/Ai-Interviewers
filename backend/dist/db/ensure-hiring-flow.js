"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureHiringFlowTables = ensureHiringFlowTables;
const client_1 = require("./client");
async function ensureHiringFlowTables() {
    await (0, client_1.query)(`
    CREATE TABLE IF NOT EXISTS positions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      company_name VARCHAR(255),
      description TEXT,
      requirements TEXT,
      location VARCHAR(255),
      salary_range VARCHAR(100),
      role VARCHAR(50) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
    await (0, client_1.query)(`
    ALTER TABLE positions
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
  `);
    // Backfill columns for instances bootstrapped from older schema versions.
    await (0, client_1.query)(`
    ALTER TABLE positions
    ADD COLUMN IF NOT EXISTS description TEXT;
  `);
    await (0, client_1.query)(`
    ALTER TABLE positions
    ADD COLUMN IF NOT EXISTS requirements TEXT;
  `);
    await (0, client_1.query)(`
    ALTER TABLE positions
    ADD COLUMN IF NOT EXISTS location VARCHAR(255);
  `);
    await (0, client_1.query)(`
    ALTER TABLE positions
    ADD COLUMN IF NOT EXISTS salary_range VARCHAR(100);
  `);
    await (0, client_1.query)(`
    ALTER TABLE positions
    ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
  `);
    await (0, client_1.query)(`
    ALTER TABLE positions
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
  `);
    await (0, client_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_positions_created_by ON positions(created_by);
  `);
    await (0, client_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_positions_is_active ON positions(is_active);
  `);
    await (0, client_1.query)(`
    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      candidate_id UUID NOT NULL REFERENCES candidates(id),
      position_id UUID NOT NULL REFERENCES positions(id),
      resume_url VARCHAR(255),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
    await (0, client_1.query)(`
    ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS cover_letter TEXT;
  `);
    await (0, client_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_applications_position_id ON applications(position_id);
  `);
    await (0, client_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
  `);
    await (0, client_1.query)(`
    CREATE TABLE IF NOT EXISTS candidate_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      candidate_id UUID NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
    await (0, client_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_candidate_accounts_candidate_id ON candidate_accounts(candidate_id);
  `);
    await (0, client_1.query)(`
    ALTER TABLE candidates
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
  `);
    await (0, client_1.query)(`
    ALTER TABLE candidates
    ADD COLUMN IF NOT EXISTS location VARCHAR(255);
  `);
    await (0, client_1.query)(`
    ALTER TABLE candidates
    ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255);
  `);
    await (0, client_1.query)(`
    ALTER TABLE candidates
    ADD COLUMN IF NOT EXISTS portfolio_url VARCHAR(255);
  `);
    await (0, client_1.query)(`
    DO $$
    BEGIN
      IF to_regclass('public.scheduled_interviews') IS NOT NULL THEN
        ALTER TABLE scheduled_interviews
        ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE SET NULL;
        ALTER TABLE scheduled_interviews
        ADD COLUMN IF NOT EXISTS email_sent BOOLEAN;
        ALTER TABLE scheduled_interviews
        ADD COLUMN IF NOT EXISTS email_error TEXT;
        ALTER TABLE scheduled_interviews
        ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
        ALTER TABLE scheduled_interviews
        ADD COLUMN IF NOT EXISTS preferred_difficulty VARCHAR(10);
        ALTER TABLE scheduled_interviews
        ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE scheduled_interviews
        ADD COLUMN IF NOT EXISTS focus_areas TEXT;
        ALTER TABLE scheduled_interviews
        ADD COLUMN IF NOT EXISTS duration_minutes INT;
        CREATE INDEX IF NOT EXISTS idx_scheduled_interviews_application_id ON scheduled_interviews(application_id);
      END IF;
    END $$;
  `);
}
//# sourceMappingURL=ensure-hiring-flow.js.map
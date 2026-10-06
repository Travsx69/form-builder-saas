-- Conditional logic MVP: allow a rule to be stored disabled, and index rule
-- lookups by form (the public renderer and submit endpoint both fetch them).
ALTER TABLE "logic_rules" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "logic_rules_form_id_idx" ON "logic_rules"("form_id");

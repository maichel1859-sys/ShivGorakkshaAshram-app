-- Rename column in consultation_sessions table
ALTER TABLE "consultation_sessions" RENAME COLUMN "patientId" TO "devoteeId";

-- Update any existing data or constraints if needed
-- (In this case, the foreign key constraints will be automatically handled by Prisma)

-- This migration renames patient-related fields to devotee-related fields
-- to better reflect the spiritual nature of the ashram application
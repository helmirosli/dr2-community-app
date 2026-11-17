-- Remember which walkthrough tours each person has already seen, so a finished or skipped tour stays off.
ALTER TABLE "User" ADD COLUMN "tourState" JSONB NOT NULL DEFAULT '{}';

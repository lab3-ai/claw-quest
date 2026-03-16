-- AddColumn verification_config to clawhub_skills
ALTER TABLE "clawhub_skills" ADD COLUMN "verification_config" JSONB;

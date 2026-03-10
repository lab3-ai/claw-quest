-- AddColumn: Quest.llmKeyTokenLimit
ALTER TABLE "Quest" ADD COLUMN "llmKeyTokenLimit" INTEGER DEFAULT 1000000;

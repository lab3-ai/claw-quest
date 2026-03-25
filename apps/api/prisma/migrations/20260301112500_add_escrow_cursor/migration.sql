-- CreateTable
CREATE TABLE "EscrowCursor" (
    "chainId" INTEGER NOT NULL,
    "lastBlock" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowCursor_pkey" PRIMARY KEY ("chainId")
);

-- CreateTable
CREATE TABLE "ChatAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "messageId" TEXT,
    "role" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelProvider" TEXT NOT NULL,
    "isLocal" BOOLEAN NOT NULL DEFAULT false,
    "sensitivityLevel" TEXT,
    "piiDetected" BOOLEAN NOT NULL DEFAULT false,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cloudCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costSaved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "routingTimeMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "auditId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatAnalytics_userId_idx" ON "ChatAnalytics"("userId");

-- CreateIndex
CREATE INDEX "ChatAnalytics_sessionId_idx" ON "ChatAnalytics"("sessionId");

-- CreateIndex
CREATE INDEX "ChatAnalytics_model_idx" ON "ChatAnalytics"("model");

-- CreateIndex
CREATE INDEX "ChatAnalytics_modelProvider_idx" ON "ChatAnalytics"("modelProvider");

-- CreateIndex
CREATE INDEX "ChatAnalytics_createdAt_idx" ON "ChatAnalytics"("createdAt");

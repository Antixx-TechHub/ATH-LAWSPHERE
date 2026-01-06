-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('PERSON', 'ORGANIZATION', 'LAW_REFERENCE', 'DATE', 'LOCATION', 'CLAIM', 'EVIDENCE', 'EVENT', 'DOCUMENT', 'CONCEPT');

-- CreateEnum
CREATE TYPE "GraphStatus" AS ENUM ('PENDING', 'BUILDING', 'READY', 'ERROR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExp" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "KnowledgeNode" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" "NodeType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "properties" JSONB,
    "position" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,

    CONSTRAINT "KnowledgeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEdge" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "label" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeGraph" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT,
    "status" "GraphStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT,
    "lastBuiltAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nodeCount" INTEGER NOT NULL DEFAULT 0,
    "edgeCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KnowledgeGraph_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeNode_sessionId_idx" ON "KnowledgeNode"("sessionId");

-- CreateIndex
CREATE INDEX "KnowledgeNode_type_idx" ON "KnowledgeNode"("type");

-- CreateIndex
CREATE INDEX "KnowledgeNode_label_idx" ON "KnowledgeNode"("label");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_sourceId_idx" ON "KnowledgeEdge"("sourceId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_targetId_idx" ON "KnowledgeEdge"("targetId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_relation_idx" ON "KnowledgeEdge"("relation");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeGraph_sessionId_key" ON "KnowledgeGraph"("sessionId");

-- CreateIndex
CREATE INDEX "KnowledgeGraph_sessionId_idx" ON "KnowledgeGraph"("sessionId");

-- CreateIndex
CREATE INDEX "KnowledgeGraph_status_idx" ON "KnowledgeGraph"("status");

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

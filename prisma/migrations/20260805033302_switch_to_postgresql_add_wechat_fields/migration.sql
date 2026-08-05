-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '',
    "wechatOpenId" TEXT,
    "wechatAvatar" TEXT DEFAULT '',
    "wechatNickname" TEXT DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'PARENT',
    "pin" TEXT DEFAULT '1234',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '👦',
    "points" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "totalCheckIns" INTEGER NOT NULL DEFAULT 0,
    "pet" TEXT NOT NULL DEFAULT '{"type":"cat","name":"小咪","level":1,"mood":"normal"}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildAccount" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRecord" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "charId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "score" INTEGER,
    "accuracy" DOUBLE PRECISION,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInRecord" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "allCompleted" BOOLEAN NOT NULL DEFAULT false,
    "bonusEarned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInTask" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CheckInTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningContent" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Parent_username_key" ON "Parent"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_wechatOpenId_key" ON "Parent"("wechatOpenId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildAccount_childId_key" ON "ChildAccount"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildAccount_username_key" ON "ChildAccount"("username");

-- CreateIndex
CREATE INDEX "LearningRecord_childId_subject_date_idx" ON "LearningRecord"("childId", "subject", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInRecord_childId_date_key" ON "CheckInRecord"("childId", "date");

-- CreateIndex
CREATE INDEX "LearningContent_subject_level_idx" ON "LearningContent"("subject", "level");

-- CreateIndex
CREATE UNIQUE INDEX "LearningContent_subject_order_key" ON "LearningContent"("subject", "order");

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildAccount" ADD CONSTRAINT "ChildAccount_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRecord" ADD CONSTRAINT "LearningRecord_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInRecord" ADD CONSTRAINT "CheckInRecord_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInTask" ADD CONSTRAINT "CheckInTask_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "CheckInRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

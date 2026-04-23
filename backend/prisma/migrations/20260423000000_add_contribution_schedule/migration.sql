-- CreateTable: ContributionSchedule
CREATE TABLE "ContributionSchedule" (
    "id"                 TEXT NOT NULL,
    "groupId"            TEXT NOT NULL,
    "frequency"          TEXT NOT NULL,
    "intervalDays"       INTEGER,
    "gracePeriodHours"   INTEGER NOT NULL DEFAULT 24,
    "paymentWindowHours" INTEGER NOT NULL DEFAULT 72,
    "startDate"          TIMESTAMP(3) NOT NULL,
    "nextDueDate"        TIMESTAMP(3) NOT NULL,
    "isActive"           BOOLEAN NOT NULL DEFAULT true,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PaymentWindow
CREATE TABLE "PaymentWindow" (
    "id"          TEXT NOT NULL,
    "scheduleId"  TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "opensAt"     TIMESTAMP(3) NOT NULL,
    "dueAt"       TIMESTAMP(3) NOT NULL,
    "closesAt"    TIMESTAMP(3),
    "status"      TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentWindow_pkey" PRIMARY KEY ("id")
);

-- Unique & indexes
CREATE UNIQUE INDEX "ContributionSchedule_groupId_key" ON "ContributionSchedule"("groupId");
CREATE INDEX "ContributionSchedule_nextDueDate_idx" ON "ContributionSchedule"("nextDueDate");
CREATE INDEX "ContributionSchedule_isActive_nextDueDate_idx" ON "ContributionSchedule"("isActive", "nextDueDate");

CREATE UNIQUE INDEX "PaymentWindow_scheduleId_cycleNumber_key" ON "PaymentWindow"("scheduleId", "cycleNumber");
CREATE INDEX "PaymentWindow_scheduleId_status_idx" ON "PaymentWindow"("scheduleId", "status");
CREATE INDEX "PaymentWindow_dueAt_idx" ON "PaymentWindow"("dueAt");
CREATE INDEX "PaymentWindow_closesAt_idx" ON "PaymentWindow"("closesAt");

-- Foreign keys
ALTER TABLE "ContributionSchedule" ADD CONSTRAINT "ContributionSchedule_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentWindow" ADD CONSTRAINT "PaymentWindow_scheduleId_fkey"
    FOREIGN KEY ("scheduleId") REFERENCES "ContributionSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

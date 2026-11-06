-- CreateTable
CREATE TABLE "teamwork_installation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "teamworkUserName" TEXT NOT NULL,
    "installedById" TEXT,

    CONSTRAINT "teamwork_installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_teamwork_link" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "teamworkInstallationId" TEXT NOT NULL,
    "teamworkProjectId" TEXT NOT NULL,
    "teamworkProjectName" TEXT NOT NULL,
    "tasklistId" TEXT NOT NULL,
    "tasklistName" TEXT NOT NULL,
    "autoCreateTasks" BOOLEAN NOT NULL DEFAULT false,
    "linkHealthIssue" TEXT,

    CONSTRAINT "project_teamwork_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_teamwork_task_link" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "projectTeamworkLinkId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskUrl" TEXT NOT NULL,
    "lastSyncSource" TEXT,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "feedback_teamwork_task_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teamwork_installation_organizationId_key" ON "teamwork_installation"("organizationId");

-- CreateIndex
CREATE INDEX "teamwork_installation_organizationId_idx" ON "teamwork_installation"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "project_teamwork_link_projectId_key" ON "project_teamwork_link"("projectId");

-- CreateIndex
CREATE INDEX "project_teamwork_link_teamworkInstallationId_idx" ON "project_teamwork_link"("teamworkInstallationId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_teamwork_task_link_feedbackId_key" ON "feedback_teamwork_task_link"("feedbackId");

-- CreateIndex
CREATE INDEX "feedback_teamwork_task_link_projectTeamworkLinkId_idx" ON "feedback_teamwork_task_link"("projectTeamworkLinkId");

-- CreateIndex
CREATE INDEX "feedback_teamwork_task_link_taskId_idx" ON "feedback_teamwork_task_link"("taskId");

-- AddForeignKey
ALTER TABLE "teamwork_installation" ADD CONSTRAINT "teamwork_installation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teamwork_installation" ADD CONSTRAINT "teamwork_installation_installedById_fkey" FOREIGN KEY ("installedById") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_teamwork_link" ADD CONSTRAINT "project_teamwork_link_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_teamwork_link" ADD CONSTRAINT "project_teamwork_link_teamworkInstallationId_fkey" FOREIGN KEY ("teamworkInstallationId") REFERENCES "teamwork_installation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_teamwork_task_link" ADD CONSTRAINT "feedback_teamwork_task_link_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_teamwork_task_link" ADD CONSTRAINT "feedback_teamwork_task_link_projectTeamworkLinkId_fkey" FOREIGN KEY ("projectTeamworkLinkId") REFERENCES "project_teamwork_link"("id") ON DELETE CASCADE ON UPDATE CASCADE;


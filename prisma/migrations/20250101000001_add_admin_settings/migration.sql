-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requireApprovalIfAnyNegativeLineMargin" BOOLEAN NOT NULL DEFAULT true,
    "requireApprovalIfMarginBelowPercent" BOOLEAN NOT NULL DEFAULT false,
    "marginPercentThreshold" REAL NOT NULL DEFAULT 0,
    "requireApprovalIfOrderTotalMarginNegative" BOOLEAN NOT NULL DEFAULT false,
    "blockWorkflowUntilApproved" BOOLEAN NOT NULL DEFAULT true,
    "approvalMessage" TEXT NOT NULL DEFAULT 'Commande à valider (marge anormale)',
    "updatedAt" DATETIME NOT NULL
);

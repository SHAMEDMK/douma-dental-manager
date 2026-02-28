-- AuditLog: index composite pour filtres UI audit (par utilisateur + tri par date).
-- Les index [createdAt], [entityType, entityId], [userId] existent déjà (init).
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AuditLog: index composite pour filtres UI audit (par utilisateur + tri par date).
-- Les index [createdAt], [entityType, entityId], [userId] existent déjà (init).
-- IF NOT EXISTS: idempotent si index créé via db push ou application partielle.
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

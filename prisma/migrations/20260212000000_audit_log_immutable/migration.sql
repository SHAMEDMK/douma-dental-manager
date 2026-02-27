-- AuditLog is append-only: forbid UPDATE and DELETE at the database level.
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is immutable';
END;
$$;

CREATE TRIGGER audit_log_immutable_trigger
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW
  EXECUTE PROCEDURE prevent_audit_log_modification();

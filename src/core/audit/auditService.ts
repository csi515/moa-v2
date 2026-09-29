import { listAuditLogs } from './auditRepository';
import { writeAuditLog } from './auditWriter';
import type { AuditLog, AuditLogQuery, WriteAuditLogInput } from './types';

export const auditService = {
  list(query: AuditLogQuery): Promise<AuditLog[]> {
    return listAuditLogs(query);
  },
  write(input: WriteAuditLogInput): Promise<string> {
    return writeAuditLog(input);
  },
};

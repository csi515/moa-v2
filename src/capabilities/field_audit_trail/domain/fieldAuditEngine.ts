export interface AuditTrailLog {
  id: string;
  entityName: string;
  recordId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  operatorUserId: string;
  operatorName: string;
  changeReason: string;
  changedAt: string;
}

export function createAuditDiff(
  entityName: string,
  recordId: string,
  operatorUserId: string,
  operatorName: string,
  changeReason: string,
  beforeObj: Record<string, any>,
  afterObj: Record<string, any>,
  timestampStr = new Date().toISOString()
): AuditTrailLog[] {
  const logs: AuditTrailLog[] = [];
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  let counter = 1;
  for (const key of keys) {
    const valBefore = beforeObj[key] !== undefined ? String(beforeObj[key]) : '';
    const valAfter = afterObj[key] !== undefined ? String(afterObj[key]) : '';

    if (valBefore !== valAfter) {
      logs.push({
        id: `aud_${Date.now()}_${counter++}`,
        entityName,
        recordId,
        fieldName: key,
        oldValue: valBefore,
        newValue: valAfter,
        operatorUserId,
        operatorName,
        changeReason: changeReason || '사유 미입력',
        changedAt: timestampStr,
      });
    }
  }

  return logs;
}

export function filterLogsByEntity(
  logs: AuditTrailLog[],
  entityName: string
): AuditTrailLog[] {
  if (!entityName) return logs;
  return logs.filter((l) => l.entityName.toLowerCase() === entityName.toLowerCase());
}

export function filterLogsByOperator(
  logs: AuditTrailLog[],
  operatorName: string
): AuditTrailLog[] {
  if (!operatorName) return logs;
  return logs.filter((l) => l.operatorName.includes(operatorName));
}

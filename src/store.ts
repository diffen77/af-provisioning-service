import { ProvisionRecord } from './types';
import logger from './logger';

// In-memory store for provisioning records
const store: Map<string, ProvisionRecord> = new Map();

export function saveProvisionRecord(record: ProvisionRecord): void {
  store.set(record.request_id, record);
  logger.info(`Saved provision record`, {
    request_id: record.request_id,
    customer_id: record.customer_id,
    status: record.status,
  });
}

export function getProvisionRecord(requestId: string): ProvisionRecord | undefined {
  return store.get(requestId);
}

export function getProvisionRecordByCustomerId(customerId: string): ProvisionRecord | undefined {
  for (const record of store.values()) {
    if (record.customer_id === customerId) {
      return record;
    }
  }
  return undefined;
}

export function updateProvisionRecord(requestId: string, updates: Partial<ProvisionRecord>): ProvisionRecord | undefined {
  const record = store.get(requestId);
  if (!record) {
    return undefined;
  }

  const updated = { ...record, ...updates, updated_at: new Date() };
  store.set(requestId, updated);
  logger.info(`Updated provision record`, {
    request_id: requestId,
    status: updated.status,
  });

  return updated;
}

export function getAllRecords(): ProvisionRecord[] {
  return Array.from(store.values());
}

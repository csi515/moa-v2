const DB_NAME = 'moa-offline-attendance';
const STORE = 'queue';

export type OfflineAttendance = {
  id: string;
  organizationId: string;
  pin: string;
  createdAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueAttendance(record: OfflineAttendance): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readAttendanceQueue(): Promise<OfflineAttendance[]> {
  const db = await openDb();
  const rows = await new Promise<OfflineAttendance[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as OfflineAttendance[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows;
}

export async function removeAttendance(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function flushAttendanceQueue(
  send: (record: OfflineAttendance) => Promise<void>
): Promise<number> {
  const rows = await readAttendanceQueue();
  let sent = 0;
  for (const row of rows) {
    await send(row);
    await removeAttendance(row.id);
    sent += 1;
  }
  return sent;
}

export function watchAttendanceOnline(onOnline: () => void): () => void {
  window.addEventListener('online', onOnline);
  return () => window.removeEventListener('online', onOnline);
}

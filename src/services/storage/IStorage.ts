export interface IStorage<T = any> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface SyncableStorage<T = any> extends IStorage<T> {
  sync(): Promise<void>;
  isDirty(): boolean;
}

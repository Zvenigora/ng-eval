import { BaseRegistryType } from "./registry-type";

export interface CacheType<TValue> extends BaseRegistryType<string, TValue> {
  type: Readonly<'Cache' | string>;
  maxCacheSize: number;
  getHashKey: (namespace: string, value: string) => string;
}

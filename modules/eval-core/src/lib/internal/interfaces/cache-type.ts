import { RegistryType } from "./registry-type";

export interface CacheType<TValue> extends RegistryType<string, TValue> {
  maxCacheSize: number;
  getHashKey: (namespace: string, value: string) => string;
}

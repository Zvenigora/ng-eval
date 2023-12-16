import { RegistryType } from "../public-api";

export interface CacheType<TValue> extends RegistryType<string, TValue> {
  type: Readonly<'Cache' | string>;
  maxCacheSize: number;
  getHashKey: (namespace: string, value: string) => string;
}

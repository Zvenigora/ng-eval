import { RegistryType } from "./registry-type";

export interface ScopeOptions {
  global?: boolean;
  caseInsensitive?: boolean;
  namespace?: string;
}

export interface RegistryOptionType<TKey, TValue> {
  registry: Readonly<RegistryType<TKey, TValue>>;
  options: Readonly<ScopeOptions>;
}

export interface ScopeType<TKey, TValue> {
  registries: RegistryOptionType<TKey, TValue>[];
  add: (registry: RegistryOptionType<TKey, TValue>) => void;
  get: (key: TKey, namespace?: string) => [TKey, TValue] | undefined;
}

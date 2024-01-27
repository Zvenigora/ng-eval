import { EvalOptions } from './eval-options';

export type EvalLookup = (key: unknown, thisArg?: unknown, options?: EvalOptions) => unknown;

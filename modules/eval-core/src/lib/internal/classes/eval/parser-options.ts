import { defaultOptions } from "acorn";
import { ParserOptions } from "../../interfaces";

/**
 * The options `EvalService` and `CompilerService` pass on every parse, as
 * this object itself; `ParserService` and `DiscoveryService` copy it when
 * constructed. Read it or copy it; do not write into it. A value written into
 * it is not reliably seen: the parse cache remembers it by identity, so a text
 * cached before the write can keep its reading, and one parsed while it held
 * the value can keep that reading after it is written back
 * (`docs/backlog-retired.md` A34).
 */
export const defaultParserOptions: ParserOptions = {
  ...defaultOptions,
  ecmaVersion: 2020,
  extractExpressions: false,
  cacheSize: 100
}

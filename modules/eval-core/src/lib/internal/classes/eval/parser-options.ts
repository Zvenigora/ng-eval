import { defaultOptions } from "acorn";
import { ParserOptions } from "../../interfaces";

export const defaultParserOptions: ParserOptions = {
  ...defaultOptions,
  ecmaVersion: 2020,
  extractExpressions: false,
  cacheSize: 100
}

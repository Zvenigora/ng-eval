import { ParserOptions } from "../../internal/interfaces";

/**
 * Base class for evaluation.
 */
export abstract class BaseEval {
  private _parserOptions!: ParserOptions;

  /**
   * Gets the parser options.
   */
  get parserOptions(): ParserOptions {
    return this._parserOptions;
  }

  /**
   * Sets the parser options.
   * @param value The parser options to set.
   */
  set parserOptions(value: ParserOptions) {
    this._parserOptions = value;
  }
}

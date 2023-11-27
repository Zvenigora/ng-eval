import { ParserOptions } from "../../internal/interfaces";

export abstract class BaseEval {

  private _parserOptions!: ParserOptions;

  get parserOptions (): ParserOptions {
    return this._parserOptions;
  }

  set parserOptions (value: ParserOptions) {
    this._parserOptions = value;
  }
}

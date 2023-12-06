/**
 * Represents the options for evaluating expressions.
 */
export class EvalOptions {

  private _caseInsensitive?: boolean;

  /**
   * Gets or sets a value indicating whether the evaluation should be case-insensitive.
   */
  public get caseInsensitive(): boolean | undefined {
    return this._caseInsensitive;
  }

  /**
   * Gets the value of the EvalOptions object as a record of string keys and unknown values.
   * @returns The value of the EvalOptions object.
   */
  public get value(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    if (this._caseInsensitive !== undefined) {
      obj['caseInsensitive'] = this._caseInsensitive;
    }
    return obj;
  }

  constructor(
    caseInsensitive = false
  ) {
    this._caseInsensitive = caseInsensitive;
  }

}

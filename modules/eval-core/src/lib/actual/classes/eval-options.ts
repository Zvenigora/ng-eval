/**
 * Represents the options for evaluating expressions.
 */
export class EvalOptions {

  private _caseInsensitive?: boolean;
  private _trackTime?: boolean;

  /**
   * Gets or sets a value indicating whether the evaluation should be case-insensitive.
   */
  public get caseInsensitive(): boolean | undefined {
    return this._caseInsensitive;
  }

  /**
   * Gets or sets a value indicating whether the evaluation should track time.
   */
  public get trackTime(): boolean | undefined {
    return this._trackTime;
  }
  public set trackTime(value: boolean | undefined) {
    this._trackTime = value;
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
    caseInsensitive = false,
    trackTime = false
  ) {
    this._caseInsensitive = caseInsensitive;
    this._trackTime = trackTime;
  }

}

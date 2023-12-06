import { Registry } from '../../internal/classes';
import { EvalOptions } from './eval-options';

/**
 * Represents the evaluation context for the code execution.
 */
export class EvalContext {
  private _original: Readonly<Registry<unknown, unknown>>;
  private _scopes: Readonly<Registry<unknown, unknown>[]>;
  private _options: Readonly<EvalOptions>;

  /**
   * Gets the original registry.
   */
  public get original(): Readonly<Registry<unknown, unknown>> {
    return this._original;
  }

  /**
   * Gets the scopes registry.
   */
  public get scopes(): Readonly<Registry<unknown, unknown>[]> {
    return this._scopes;
  }

  /**
   * Gets the evaluation options.
   */
  public get options(): EvalOptions {
    return this._options;
  }

  /**
   * Creates a new instance of EvalContext.
   * @param original - The original registry or an object to create a registry from.
   * @param options - The evaluation options.
   */
  constructor(
    original: Registry<unknown, unknown> | Record<string, unknown>  | undefined,
    options: EvalOptions
  ) {
    if (original instanceof Registry) {
      this._original = original;
    } else if (!original) {
      this._original = new Registry<unknown, unknown>(undefined, options.value);
    } else {
      this._original = Registry.fromObject(original, options.value);
    }
    this._scopes = [];
    this._options = options;
  }

  public static toContext(context?: EvalContext | Record<string, unknown> | Registry<string, unknown> | undefined,
                          options?: EvalOptions): EvalContext {
    if (!context) {
      return new EvalContext(undefined, options || new EvalOptions());
    } else if (context instanceof EvalContext) {
      return context;
    } else if (context instanceof Registry) {
      return new EvalContext(context, options || new EvalOptions());
    }
    return new EvalContext(context as Record<string, unknown>, options || new EvalOptions());
  }
}

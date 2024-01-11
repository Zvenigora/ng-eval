import { AnyNode } from "acorn";
import { ParserOptions } from "../../internal/interfaces";
import { ParserService } from "./parser.service";
import { EvalContext, EvalOptions, EvalState } from "../../internal/classes/eval";
import { Context } from "../../internal/public-api";

/**
 * Base class for evaluation.
 */
export abstract class BaseEval {
  private _parserOptions!: ParserOptions;

  constructor(
    protected parserService: ParserService
  ) {}

  /**
   * Gets the parser options.
   */
  protected get parserOptions(): ParserOptions {
    return this._parserOptions;
  }

  /**
   * Sets the parser options.
   * @param value The parser options to set.
   */
  protected set parserOptions(value: ParserOptions) {
    this._parserOptions = value;
  }

  /**
   * Parses the given expression into an abstract syntax tree (AST).
   * @param expression - The expression to parse.
   * @returns The parsed AST.
   */
  protected parse(expression: string | AnyNode | undefined): AnyNode | undefined {
    if (!expression) {
      return undefined;
    } else if (typeof expression === 'string') {
      const ast = this.parserService.parse(expression, this.parserOptions);
      return ast;
    } else {
      return expression as AnyNode;
    }
  }

  /**
   * Creates an instance of EvalState.
   * @param context - The evaluation context or context object.
   * @param options - The evaluation options.
   * @returns The created EvalState instance.
   */
  createState(context?: EvalContext | Context,
              options?: EvalOptions): EvalState {
    const state = EvalState.fromContext(context, options);
    return state;
  }
}

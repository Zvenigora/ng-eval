import { StackType } from "../interfaces/stack-type";

/**
 * Represents a stack data structure.
 * @template T The type of elements in the stack.
 */
export class Stack<T> implements StackType<T> {

  /**
   * Creates a new instance of the Stack class.
   * @param _stack An optional array to initialize the stack.
   */
  public constructor(
    private readonly _stack: T[] = []
  ) {}

  /**
   * Gets the number of elements in the stack.
   */
  public get length(): number {
    return this._stack.length;
  }

  /**
   * Returns the top element of the stack without removing it.
   * @returns The top element of the stack.
   */
  public peek(): T {
    return this._stack[this._stack.length - 1];
  }

  /**
   * Removes and returns the top element of the stack.
   * @returns The top element of the stack, or undefined if the stack is empty.
   */
  public pop(): T | undefined{
    return this._stack.pop();
  }

  /**
   * Adds an element to the top of the stack.
   * @param value The element to be added to the stack.
   * @returns The new length of the stack.
   */
  public push(value: T): number {
    return this._stack.push(value);
  }

  /**
   * Swaps the positions of the top two elements in the stack.
   */
  public swap(): void {
    const length = this._stack.length;
    const temp = this._stack[length - 1];
    this._stack[length - 1] = this._stack[length - 2];
    this._stack[length - 2] = temp;
  }

}

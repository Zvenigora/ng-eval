import { StackType } from '../../interfaces';

/**
 * Represents a stack data structure with proper memory management.
 * @template T The type of elements in the stack.
 */
export class Stack<T> implements StackType<T> {
  private _disposed = false;

  /**
   * Creates a new instance of the Stack class.
   * @param _stack An optional array to initialize the stack.
   */
  public constructor(
    private _stack: T[] = []
  ) {}

  /**
   * Check if the stack has been disposed
   */
  private checkDisposed(): void {
    if (this._disposed) {
      throw new Error('Stack has been disposed and cannot be used');
    }
  }

  /**
   * Gets the number of elements in the stack.
   */
  public get length(): number {
    this.checkDisposed();
    return this._stack.length;
  }

  /**
   * Returns the top element of the stack without removing it.
   * @returns The top element of the stack.
   */
  public peek(): T {
    this.checkDisposed();
    return this._stack[this._stack.length - 1];
  }

  /**
   * Removes and returns the top element of the stack.
   * @returns The top element of the stack, or undefined if the stack is empty.
   */
  public pop(): T | undefined{
    this.checkDisposed();
    return this._stack.pop();
  }

  /**
   * Adds an element to the top of the stack.
   * @param value The element to be added to the stack.
   * @returns The new length of the stack.
   */
  public push(value: T): number {
    this.checkDisposed();
    return this._stack.push(value);
  }

  /**
   * Swaps the positions of the top two elements in the stack.
   */
  public swap(): void {
    this.checkDisposed();
    const length = this._stack.length;
    const temp = this._stack[length - 1];
    this._stack[length - 1] = this._stack[length - 2];
    this._stack[length - 2] = temp;
  }

  /**
   * Returns the elements of the stack as an array in reverse order.
   *
   * @returns An array containing the elements of the stack in reverse order.
   */
  public asArray(): T[] {
    this.checkDisposed();
    return [...this._stack].reverse();
  }

  /**
   * Clears all elements from the stack
   */
  public clear(): void {
    this.checkDisposed();
    // Clear all references to help with garbage collection
    if (this._stack) {
      this._stack.length = 0;
    }
  }

  /**
   * Properly dispose of the stack and clean up memory
   */
  public dispose(): void {
    if (!this._disposed) {
      this._disposed = true;
      
      // Clear the stack array and nullify reference
      if (this._stack) {
        this._stack.length = 0;
        (this as unknown as { _stack?: T[] })._stack = undefined;
      }
    }
  }

  /**
   * Check if the stack has been disposed
   */
  public isDisposed(): boolean {
    return this._disposed;
  }
}

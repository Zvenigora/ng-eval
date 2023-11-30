export interface StackType<T> {
  peek(): T;
  pop(): T | undefined;
  push(value: T): number;
  swap(): void;
}

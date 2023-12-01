export interface QueueType<T> {
  length: number;
  dequeue(): T | undefined;
  enqueue(value: T): number;
  peek(): T;
}

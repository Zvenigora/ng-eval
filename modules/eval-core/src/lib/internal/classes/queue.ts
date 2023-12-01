import { QueueType } from '../interfaces';

/**
 * Represents a generic queue data structure.
 * @template T The type of elements stored in the queue.
 */
export class Queue<T> implements QueueType<T> {

    /**
     * Creates a new instance of the Queue class.
     * @param _queue Optional initial array of elements.
     */
    public constructor(
      private readonly _queue: T[] = []
    ) {}

    /**
     * Gets the number of elements in the queue.
     */
    public get length(): number {
      return this._queue.length;
    }

    /**
     * Removes and returns the first element in the queue.
     * @returns The first element in the queue, or undefined if the queue is empty.
     */
    public dequeue(): T | undefined {
      return this._queue.shift();
    }

    /**
     * Adds an element to the end of the queue.
     * @param value The element to add to the queue.
     * @returns The new length of the queue.
     */
    public enqueue(value: T): number {
      return this._queue.push(value);
    }

    /**
     * Returns the first element in the queue without removing it.
     * @returns The first element in the queue.
     */
    public peek(): T {
      return this._queue[0];
    }
}

import { Queue } from './queue';

describe('Queue', () => {
  let queue: Queue<number>;

  beforeEach(() => {
    queue = new Queue<number>();
  });

  it('should create an instance', () => {
    expect(queue).toBeTruthy();
  });

  it('should have a length of 0 when created', () => {
    expect(queue.length).toBe(0);
  });

  it('should enqueue elements correctly', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    expect(queue.length).toBe(3);
    expect(queue.peek()).toBe(1);
  });

  it('should dequeue elements correctly', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    const dequeued = queue.dequeue();

    expect(dequeued).toBe(1);
    expect(queue.length).toBe(2);
    expect(queue.peek()).toBe(2);
  });

  it('should return undefined when dequeueing from an empty queue', () => {
    const dequeued = queue.dequeue();

    expect(dequeued).toBeUndefined();
  });
});

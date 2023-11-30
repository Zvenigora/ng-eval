import { Stack } from './stack';

describe('Stack', () => {
  let stack: Stack<number>;

  beforeEach(() => {
    stack = new Stack<number>();
  });

  it('should create an instance', () => {
    expect(stack).toBeTruthy();
  });

  it('should have a length of 0 when initialized', () => {
    expect(stack.length).toBe(0);
  });

  it('should return undefined when peeking an empty stack', () => {
    expect(stack.peek()).toBeUndefined();
  });

  it('should return undefined when popping an empty stack', () => {
    expect(stack.pop()).toBeUndefined();
  });

  it('should add an element to the top of the stack', () => {
    stack.push(1);
    expect(stack.length).toBe(1);
    expect(stack.peek()).toBe(1);
  });

  it('should remove and return the top element of the stack', () => {
    stack.push(1);
    stack.push(2);
    expect(stack.pop()).toBe(2);
    expect(stack.length).toBe(1);
    expect(stack.peek()).toBe(1);
  });

  it('should swap the positions of the top two elements in the stack', () => {
    stack.push(1);
    stack.push(2);
    expect(stack.length).toBe(2);
    expect(stack.peek()).toBe(2);
    stack.swap();
    expect(stack.length).toBe(2);
    expect(stack.peek()).toBe(1);
  });
});

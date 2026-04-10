import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from './EventEmitter.js';

describe('EventEmitter', () => {
  it('should register and emit events', () => {
    const emitter = new EventEmitter();
    const callback = vi.fn();

    emitter.on('testEvent', callback);
    emitter.emit('testEvent', 'arg1', 'arg2');

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe from events correctly', () => {
    const emitter = new EventEmitter();
    const callback = vi.fn();

    emitter.on('testEvent', callback);
    emitter.off('testEvent', callback);
    emitter.emit('testEvent');

    expect(callback).not.toHaveBeenCalled();
  });
});

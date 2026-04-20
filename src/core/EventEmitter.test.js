import { describe, it, expect } from 'vitest';
import { EventEmitter } from './EventEmitter.js';

describe('EventEmitter', () => {
  it('should register and emit events', () => {
    const emitter = new EventEmitter();

    let calledArgs = null;
    let callCount = 0;
    const callback = (...args) => {
        calledArgs = args;
        callCount++;
    };


    emitter.on('testEvent', callback);
    emitter.emit('testEvent', 'arg1', 'arg2');


    expect(calledArgs).toEqual(['arg1', 'arg2']);


    expect(callCount).toBe(1);

  });

  it('should unsubscribe from events correctly', () => {
    const emitter = new EventEmitter();

    let calledArgs = null;
    let callCount = 0;
    const callback = (...args) => {
        calledArgs = args;
        callCount++;
    };


    emitter.on('testEvent', callback);
    emitter.off('testEvent', callback);
    emitter.emit('testEvent');


    expect(callCount).toBe(0);

  });
});

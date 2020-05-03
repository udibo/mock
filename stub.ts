import { Spy, spy, SpyCall, SpyError } from "./spy.ts";

/** An instance method wrapper that overrides the original method and records all calls made to it. */
export interface Stub<T> extends Spy<T> {
  /** A queue of values that the stub will return. */
  returns: any[];
}

/** Wraps an instance method with a Stub. */
function stub<T>(instance: T, method: string): Stub<T>;
function stub<T>(instance: T, method: string, returns: any[]): Stub<T>;
function stub<T>(instance: T, method: string, func: Function): Stub<T>;
function stub<T>(
  instance: T,
  method: string,
  arrOrFunc?: Function | any[],
): Stub<T> {
  const stub: Stub<T> = spy(instance, method) as Stub<T>;
  stub.returns = Array.isArray(arrOrFunc) ? arrOrFunc : [];
  const func: Function = typeof arrOrFunc === "function"
    ? function (this: T) {
      return arrOrFunc.apply(this, arguments);
    }
    : typeof arrOrFunc === "undefined"
    ? () => undefined
    : () => {
      throw new SpyError("no return for call");
    };
  stub.func = function () {
    if (stub.returns.length === 0) return func.apply(this, arguments);
    return stub.returns.shift();
  };
  return stub;
}

/** Creates a function that returns the instance the method was called on. */
export function returnsThis(): (...args: any[]) => ThisType<any> {
  return function <T>(this: T) {
    return this;
  };
}

/** Creates a function that returns one of its arguments. */
export function returnsArg(idx: number): (...args: any[]) => any {
  return function () {
    return arguments[idx];
  };
}

/** Creates a function that returns its arguments or a subset of them. If end is specified, it will return arguments up to but not including the end. */
export function returnsArgs(
  start: number = 0,
  end?: number,
): (...args: any[]) => any {
  return function () {
    return Array.prototype.slice.call(arguments, start, end);
  };
}

/** Creates a function that throws a specific error. */
export function throws(error: any): (...args: any[]) => any {
  return function () {
    throw error;
  };
}

/** Creates a function that returns a promise that will resolve a specific value. */
export function resolves(value: any): (...args: any[]) => Promise<any> {
  return () => Promise.resolve(value);
}

/** Creates a function that returns a promise that will reject a specific error. */
export function rejects(error: any): (...args: any[]) => Promise<any> {
  return () => Promise.reject(error);
}

export {
  Spy,
  SpyCall,
  SpyError,
  spy,
  stub,
};

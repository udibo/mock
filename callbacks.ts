/** This module is browser compatible. */

/** Creates a function that returns the instance the method was called on. */
// deno-lint-ignore no-explicit-any
export function returnsThis<T>(): (...args: any[]) => ThisType<T> {
  return function <T>(this: T): ThisType<T> {
    return this;
  };
}

/** Creates a function that returns one of its arguments. */
// deno-lint-ignore no-explicit-any
export function returnsArg(idx: number): (...args: any[]) => any {
  return function () {
    return arguments[idx];
  };
}

/** Creates a function that returns its arguments or a subset of them. If end is specified, it will return arguments up to but not including the end. */
export function returnsArgs(
  start = 0,
  end?: number,
  // deno-lint-ignore no-explicit-any
): (...args: any[]) => any {
  return function () {
    return Array.prototype.slice.call(arguments, start, end);
  };
}

/** Creates a function that throws a specific error. */
// deno-lint-ignore no-explicit-any
export function throws(error: any): (...args: any[]) => any {
  return function () {
    throw error;
  };
}

/** Creates a function that returns a promise that will resolve a specific value. */
// deno-lint-ignore no-explicit-any
export function resolves(value: any): (...args: any[]) => Promise<any> {
  return () => Promise.resolve(value);
}

/** Creates a function that returns a promise that will reject a specific error. */
// deno-lint-ignore no-explicit-any
export function rejects(error: any): (...args: any[]) => Promise<any> {
  return () => Promise.reject(error);
}

/** Creates a function that returns the time difference between when it is called and when it was created. */
export function fromNow(): () => number {
  const start: number = Date.now();
  return () => Date.now() - start;
}

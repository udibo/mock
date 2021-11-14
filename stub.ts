/** This module is browser compatible. */

import { Spy, spy, SpyCall, SpyError, SpyMixin } from "./spy.ts";

/** An instance method wrapper that overrides the original method and records all calls made to it. */
export interface Stub<T> extends Spy<T> {
  /** A queue of values that the stub will return. */
  returns: unknown[];
}

/** Wraps an instance method with a Stub. */
function stub<T>(instance: T, method: string | number | symbol): Stub<T>;
function stub<T>(
  instance: T,
  method: string | number | symbol,
  returns: unknown[],
): Stub<T>;
function stub<T>(
  instance: T,
  method: string | number | symbol,
  // deno-lint-ignore no-explicit-any
  func: (...args: any[]) => unknown,
): Stub<T>;
function stub<T>(
  instance: T,
  method: string | number | symbol,
  // deno-lint-ignore no-explicit-any
  arrOrFunc?: ((...args: any[]) => unknown) | unknown[],
): Stub<T> {
  const stub: Stub<T> = spy(instance, method) as Stub<T>;
  const stubInternal: SpyMixin<T> = stub as unknown as SpyMixin<T>;
  stub.returns = Array.isArray(arrOrFunc) ? arrOrFunc : [];
  // deno-lint-ignore no-explicit-any
  const func: (...args: any[]) => unknown = typeof arrOrFunc === "function"
    ? function (this: T) {
      return arrOrFunc.apply(this, arguments as unknown as unknown[]);
    }
    : typeof arrOrFunc === "undefined"
    ? () => undefined
    : () => {
      throw new SpyError("no return for call");
    };
  stubInternal.func = function () {
    if (stub.returns.length === 0) {
      return func.apply(this, arguments as unknown as unknown[]);
    }
    return stub.returns.shift();
  };
  return stub;
}

export type { Spy, SpyCall };
export { spy, SpyError, stub };

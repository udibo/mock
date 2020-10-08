/** This module is browser compatible. */

import { Spy, spy, SpyCall, SpyError, SpyMixin } from "./spy.ts";

/** An instance method wrapper that overrides the original method and records all calls made to it. */
export interface Stub<T> extends Spy<T> {
  /** A queue of values that the stub will return. */
  // deno-lint-ignore no-explicit-any
  returns: any[];
}

/** Wraps an instance method with a Stub. */
function stub<T>(instance: T, method: string | number | symbol): Stub<T>;
function stub<T>(
  instance: T,
  method: string | number | symbol,
  // deno-lint-ignore no-explicit-any
  returns: any[],
): Stub<T>;
function stub<T>(
  instance: T,
  method: string | number | symbol,
  // deno-lint-ignore no-explicit-any
  func: (...args: any[]) => any,
): Stub<T>;
function stub<T>(
  instance: T,
  method: string | number | symbol,
  // deno-lint-ignore no-explicit-any
  arrOrFunc?: ((...args: any[]) => any) | any[],
): Stub<T> {
  const stub: Stub<T> = spy(instance, method) as Stub<T>;
  const stubInternal: SpyMixin<T> = stub as unknown as SpyMixin<T>;
  stub.returns = Array.isArray(arrOrFunc) ? arrOrFunc : [];
  // deno-lint-ignore no-explicit-any
  const func: (...args: any[]) => any = typeof arrOrFunc === "function"
    ? function (this: T) {
      // deno-lint-ignore no-explicit-any
      return arrOrFunc.apply(this, arguments as unknown as any[]);
    }
    : typeof arrOrFunc === "undefined"
    ? () => undefined
    : () => {
      throw new SpyError("no return for call");
    };
  stubInternal.func = function () {
    if (stub.returns.length === 0) {
      // deno-lint-ignore no-explicit-any
      return func.apply(this, arguments as unknown as any[]);
    }
    return stub.returns.shift();
  };
  return stub;
}

export type { Spy, SpyCall };
export { spy, SpyError, stub };

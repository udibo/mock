/** This module is browser compatible. */

import { Spy, SpyMixin, spy, SpyCall, SpyError } from "./spy.ts";

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
    ? // deno-lint-ignore no-explicit-any
      function (this: T, ...args: any[]) {
        return arrOrFunc.apply(this, args);
      }
    : typeof arrOrFunc === "undefined"
    ? () => undefined
    : () => {
      throw new SpyError("no return for call");
    };
  // deno-lint-ignore no-explicit-any
  stubInternal.func = function (...args: any[]) {
    if (stub.returns.length === 0) {
      return func.apply(this, args);
    }
    return stub.returns.shift();
  };
  return stub;
}

export type {
  Spy,
  SpyCall,
};
export {
  SpyError,
  spy,
  stub,
};

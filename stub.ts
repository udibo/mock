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
  func: Function,
): Stub<T>;
function stub<T>(
  instance: T,
  method: string | number | symbol,
  // deno-lint-ignore no-explicit-any
  arrOrFunc?: Function | any[],
): Stub<T> {
  const stub: Stub<T> = spy(instance, method) as Stub<T>;
  const stubInternal: SpyMixin<T> = stub as unknown as SpyMixin<T>;
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
  stubInternal.func = function () {
    if (stub.returns.length === 0) return func.apply(this, arguments);
    return stub.returns.shift();
  };
  return stub;
}

export {
  Spy,
  SpyCall,
  SpyError,
  spy,
  stub,
};

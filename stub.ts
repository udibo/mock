/** This module is browser compatible. */

import { AnySpyInternal, Spy, spy, SpyCall, SpyError } from "./spy.ts";

/** An instance method wrapper that overrides the original method and records all calls made to it. */
export interface Stub<T> extends Spy<T> {
  /** The original value that was replaced with the stub. */
  original: unknown;
}
export type AnyStub<T> = Stub<T> | Stub<void>;

/** Wraps an instance property with a Stub. */
function stub<T>(instance: T, property: string | number | symbol): Stub<T>;
function stub<T>(
  instance: T,
  property: string | number | symbol,
  // deno-lint-ignore no-explicit-any
  func: (...args: any[]) => unknown,
): Stub<T>;
function stub<T>(
  instance: T,
  property: string | number | symbol,
  value: unknown,
): Stub<T>;
function stub<T>(
  instance: T,
  property: string | number | symbol,
  // deno-lint-ignore no-explicit-any
  valueOrFunc?: ((...args: any[]) => unknown) | unknown,
): AnyStub<T> {
  const stub: AnyStub<T> = spy(instance, property) as AnyStub<T>;
  const stubInternal: AnySpyInternal<T> = stub;
  const { propertyDescriptor } = stubInternal;
  if (propertyDescriptor) {
    Object.defineProperty(stub, "original", propertyDescriptor);
  }
  let value: unknown;
  if (typeof valueOrFunc === "function") {
    stubInternal.func = function () {
      return valueOrFunc.apply(this, Array.from(arguments));
    };
    value = stub;
  } else if (arguments.length < 3) {
    stubInternal.func = function () {};
    value = stub;
  } else {
    value = valueOrFunc;
  }

  stubInternal.get = spy(() => value);
  stubInternal.set = spy((v: unknown) => {
    value = v;
  });

  return stub;
}

export type { Spy, SpyCall };
export { spy, SpyError, stub };

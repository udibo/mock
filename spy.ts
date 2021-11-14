/** This module is browser compatible. */

import { applyInstanceMixins } from "./deps.ts";

/** An error related to spying on a function or instance method. */
export class SpyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpyError";
  }
}

/** Call information recorded by a spy. */
export interface SpyCall {
  /** Arguments passed to a function when called. */
  args: unknown[];
  /** The instance that a method was called on. */
  self?: unknown;
  /** The value that was returned by a function. */
  returned?: unknown | Promise<unknown>;
  /** The error value that was thrown by a function. */
  error?: Error;
}

function isSpy<T>(func: unknown): func is Spy<T> {
  return typeof func === "function" &&
    Array.isArray((func as Spy<T>).calls);
}

/*
async function f(fn: (...args: any[]) => Promise<unknown>) {
  await fn();
}
f(() => null);
*/

export class SpyMixin<T> {
  // deno-lint-ignore no-explicit-any
  func?: (...args: any[]) => unknown;
  obj?: T;
  method?: keyof T;
  methodDescriptor?: PropertyDescriptor;
  get?: Spy<T>;
  set?: Spy<T>;
  restored?: boolean;

  restore(): void {
    if (this.obj && this.method) {
      if (!this.restored) {
        if (this.methodDescriptor) {
          Object.defineProperty(this.obj, this.method, this.methodDescriptor);
        } else {
          delete this.obj[this.method];
        }
        this.restored = true;
      } else throw new SpyError("instance method already restored");
    } else throw new SpyError("no instance method to restore");
  }
}

/** A function or instance method wrapper that records all calls made to it. */
export interface Spy<T> {
  // deno-lint-ignore no-explicit-any
  (this: T | void, ...args: any[]): any;
  /**
   * Information about calls made to the function or instance method or getter/setter being spied on.
   */
  calls: SpyCall[];
  /** A spy on the getter for an instance attribute. */
  get?: Spy<T>;
  /** A spy on the setter for an instance attribute. */
  set?: Spy<T>;
  /** Removes spy wrapper from instance method. */
  restore(): void;
}

/** Wraps a function or instance method with a Spy. */
type AnySpy<T> = Spy<T> | Spy<void>;
type AnySpyInternal<T> = SpyMixin<T> | SpyMixin<void>;
function spy(): Spy<void>;
// deno-lint-ignore no-explicit-any
function spy(func: (...args: any[]) => unknown): Spy<void>;
function spy<T>(obj: T, method: string | number | symbol): Spy<T>;
function spy<T>(
  // deno-lint-ignore no-explicit-any
  objOrFunc?: T | ((...args: any[]) => unknown),
  method?: string | number | symbol,
): AnySpy<T> {
  const calls: SpyCall[] = [];
  const result: AnySpy<T> = function (this: T | void): unknown {
    if (spyInternal.restored) {
      throw new SpyError("instance method already restored");
    }
    const call: SpyCall = { args: Array.from(arguments) };
    let returned: unknown;
    if (this) call.self = this;
    try {
      if (typeof spyInternal.func === "function") {
        returned = spyInternal.func.apply(this, Array.from(arguments));
      } else {
        const func: unknown = spyInternal.get?.call(undefined);
        if (typeof func === "function") {
          returned = func.apply(this, Array.from(arguments));
        } else {
          throw new SpyError("not a function");
        }
      }
      call.returned = returned;
    } catch (error) {
      call.error = error;
      calls.push(call);
      throw error;
    }
    calls.push(call);
    return returned;
  } as AnySpy<T>;
  applyInstanceMixins(result, [SpyMixin]);
  result.calls = calls;
  const spyInternal: AnySpyInternal<T> = result;
  const obj: T = objOrFunc as T;
  const methodKey: keyof T = method as keyof T;
  if (typeof method !== "undefined") {
    if (obj) spyInternal.obj = obj;
    spyInternal.method = methodKey;
    spyInternal.methodDescriptor = Object.getOwnPropertyDescriptor(
      obj,
      methodKey,
    );
    if (
      spyInternal.methodDescriptor && !spyInternal.methodDescriptor.configurable
    ) {
      throw new SpyError("cannot redefine property");
    }

    let value: unknown;
    if (!spyInternal.methodDescriptor) {
      value = obj[methodKey];
    } else if ("value" in spyInternal.methodDescriptor) {
      value = spyInternal.methodDescriptor.value;
    }
    if (typeof value === "function") {
      if (isSpy(value)) {
        console.error("already spying on function");
      }
      // deno-lint-ignore no-explicit-any
      spyInternal.func = value as (...args: any[]) => unknown;
      value = result;
    }
    spyInternal.restored = false;
    spyInternal.get = spy(
      spyInternal.methodDescriptor?.get ??
        (() => value),
    );
    spyInternal.set = spy(
      spyInternal.methodDescriptor?.set ?? ((v: unknown) => {
        value = v;
      }),
    );
    Object.defineProperty(obj, methodKey, {
      configurable: true,
      get: function () {
        return spyInternal.get?.call(this);
      },
      set: function () {
        spyInternal.set?.apply(this, Array.from(arguments));
      },
    });
  } else if (typeof objOrFunc === "function") {
    // deno-lint-ignore no-explicit-any
    spyInternal.func = objOrFunc as (...args: any[]) => unknown;
  } else {
    spyInternal.func = () => undefined;
  }
  return result;
}

export { spy };

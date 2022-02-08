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
  // deno-lint-ignore no-explicit-any
  args: any[];
  /** The instance that a method was called on. */
  // deno-lint-ignore no-explicit-any
  self?: any;
  /** The value that was returned by a function. */
  // deno-lint-ignore no-explicit-any
  returned?: any;
  /** The error value that was thrown by a function. */
  error?: Error;
}

function isSpy<T>(func: unknown): func is Spy<T> {
  return typeof func === "function" &&
    Array.isArray((func as Spy<T>).calls);
}

export class SpyMixin<T> {
  // deno-lint-ignore no-explicit-any
  func?: (...args: any[]) => unknown;
  obj?: T;
  property?: keyof T;
  propertyDescriptor?: PropertyDescriptor;
  original?: unknown;
  get?: Spy<T>;
  set?: Spy<T>;
  restored?: boolean;

  restore(): void {
    if (this.obj && this.property) {
      if (!this.restored) {
        if (this.propertyDescriptor) {
          Object.defineProperty(
            this.obj,
            this.property,
            this.propertyDescriptor,
          );
        } else {
          delete this.obj[this.property];
        }
        this.restored = true;
      } else throw new SpyError("instance property already restored");
    } else throw new SpyError("no instance property to restore");
  }
}

/** A function or instance method wrapper that records all calls made to it. */

export interface Spy<
  T,
  // deno-lint-ignore no-explicit-any
  TArgs extends any[] = any[],
  // deno-lint-ignore no-explicit-any
  TReturn extends any = any,
> {
  (this: T | void, ...args: TArgs): TReturn;
  /**
   * Information about calls made to the function or instance method or getter/setter being spied on.
   */
  calls: SpyCall[];
  /** A spy on the getter for an instance attribute. */
  get?: Spy<T>;
  /** A spy on the setter for an instance attribute. */
  set?: Spy<T>;
  /** Removes spy wrapper from instance property. */
  restore(): void;
}

/** Wraps a function or instance property with a Spy. */
export type AnySpy<T> = Spy<T> | Spy<void>;
export type AnySpyInternal<T> = SpyMixin<T> | SpyMixin<void>;
function spy(): Spy<void>;
function spy<TArgs extends unknown[], TReturn extends unknown>(
  func: (...args: TArgs) => TReturn,
): Spy<void, TArgs, TReturn>;
function spy<T>(obj: T, property: string | number | symbol): Spy<T>;
function spy<T>(
  // deno-lint-ignore no-explicit-any
  objOrFunc?: T | ((...args: any[]) => unknown),
  property?: string | number | symbol,
): AnySpy<T> {
  const calls: SpyCall[] = [];
  const result: AnySpy<T> = function (this: T | void): unknown {
    if (spyInternal.restored) {
      throw new SpyError("instance property already restored");
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
  const propertyKey: keyof T = property as keyof T;
  if (typeof property !== "undefined") {
    if (obj) spyInternal.obj = obj;
    spyInternal.property = propertyKey;
    spyInternal.propertyDescriptor = Object.getOwnPropertyDescriptor(
      obj,
      propertyKey,
    );
    if (
      spyInternal.propertyDescriptor &&
      !spyInternal.propertyDescriptor.configurable
    ) {
      throw new SpyError("cannot redefine property");
    }

    const { propertyDescriptor } = spyInternal;
    if (propertyDescriptor) {
      Object.defineProperty(spyInternal, "original", propertyDescriptor);
    } else {
      spyInternal.original = obj[propertyKey];
    }
    let value = spyInternal.original;
    if (typeof value === "function") {
      if (isSpy(value)) {
        console.error("already spying on function");
      }
      // deno-lint-ignore no-explicit-any
      spyInternal.func = spyInternal.original as (...args: any[]) => unknown;
      value = result;
    }
    spyInternal.restored = false;
    spyInternal.get = spy(
      spyInternal.propertyDescriptor?.get ??
        (() => value),
    );
    spyInternal.set = spy(
      spyInternal.propertyDescriptor?.set ?? ((v: unknown) => {
        value = v;
      }),
    );
    Object.defineProperty(obj, propertyKey, {
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

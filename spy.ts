/** This module is browser compatible. */

import { applyInstanceMixins } from "./deps/udibo/mixins/apply.ts";

/** An error related to spying on a function or instance method. */
export class SpyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpyError";
  }
}

/** An object containing call information recorded by a spy. */
export interface SpyCall {
  /** Arguments passed to a function when called. */
  // deno-lint-ignore no-explicit-any
  args: any[];
  /** The instance that a method was called on. */
  // deno-lint-ignore no-explicit-any
  self?: any;
  /** The error value that was thrown by a function. */
  // deno-lint-ignore no-explicit-any
  error?: any;
  /** The value that was returned by a function. */
  // deno-lint-ignore no-explicit-any
  returned?: any;
}

// deno-lint-ignore no-explicit-any
function isSpy<T>(func: any): func is Spy<T> {
  return typeof func === "function" &&
    Array.isArray((func as Spy<T>).calls);
}

export class SpyMixin<T> {
  calls: SpyCall[];
  func?: Function;
  obj?: T;
  method?: keyof T;
  methodDescriptor?: PropertyDescriptor;
  get?: Spy<T>;
  set?: Spy<T>;
  restored?: boolean;

  constructor() {
    this.calls = [];
  }

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
function spy(func: Function): Spy<void>;
function spy<T>(obj: T, method: string | number | symbol): Spy<T>;
function spy<T>(
  objOrFunc?: T | Function,
  method?: string | number | symbol,
): AnySpy<T> {
  const calls: SpyCall[] = [];
  // deno-lint-ignore no-explicit-any
  const result: AnySpy<T> = function (this: T | void): any {
    if (spyInternal.restored) {
      throw new SpyError("instance method already restored");
    }
    const call: SpyCall = { args: [...arguments] };
    // deno-lint-ignore no-explicit-any
    let returned: any;
    if (this) call.self = this;
    try {
      if (typeof spyInternal.func === "function") {
        returned = spyInternal.func.apply(this, Array.from(arguments));
      } else {
        const func: Function = spyInternal.get?.call(undefined);
        if (typeof func === "function") {
          func.apply(this, Array.from(arguments));
        } else {
          throw new SpyError("not a function");
        }
      }
    } catch (error) {
      call.error = error;
      calls.push(call);
      throw error;
    }
    if (typeof returned !== "undefined") call.returned = returned;
    calls.push(call);
    return returned;
  } as AnySpy<T>;
  applyInstanceMixins(result, [SpyMixin]);
  result.calls = calls;
  const spyInternal: AnySpyInternal<T> = result as unknown as AnySpyInternal<T>;
  const obj: T = objOrFunc as T;
  const methodKey: keyof T = method as keyof T;
  type Func = T[keyof T];
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

    let func: Func | null = null;
    // deno-lint-ignore no-explicit-any
    let value: any;
    if (!spyInternal.methodDescriptor) {
      func = obj[methodKey];
    } else if ("value" in spyInternal.methodDescriptor) {
      func = spyInternal.methodDescriptor.value;
    }
    if (typeof func === "function") {
      if (isSpy(func)) {
        console.error("already spying on function");
      }
      spyInternal.func = func;
      value = result;
    } else {
      value = func;
    }
    spyInternal.restored = false;
    spyInternal.get = spy(
      spyInternal.methodDescriptor?.get ??
        (() => value),
    );
    spyInternal.set = spy(
      // deno-lint-ignore no-explicit-any
      spyInternal.methodDescriptor?.set ?? ((v: any) => {
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
    spyInternal.func = objOrFunc;
  } else {
    spyInternal.func = () => undefined;
  }
  return result;
}

export { spy };

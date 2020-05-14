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
  args: any[];
  /** The instance that a method was called on. */
  self?: any;
  /** The error value that was thrown by a function. */
  error?: any;
  /** The value that was returned by a function. */
  returned?: any;
}

function isSpy<T>(func: Function): func is Spy<T> {
  return typeof func === "function" &&
    typeof (func as Spy<T>).originalFunc === "function" &&
    typeof (func as Spy<T>).func === "function" &&
    Array.isArray((func as Spy<T>).calls);
}

class SpyMixin {
  originalFunc: Function;
  func: Function;
  calls: SpyCall[];
  obj?: any;
  method?: string;
  restored?: boolean;

  constructor() {
    this.func = () => undefined;
    this.originalFunc = this.func;
    this.calls = [];
  }

  restore(): void {
    if (this.obj && this.method) {
      if (!this.restored) {
        this.obj[this.method] = this.originalFunc;
        this.restored = true;
      } else throw new SpyError("instance method already restored");
    } else throw new SpyError("no instance method to restore");
  }
}

/** A function or instance method wrapper that records all calls made to it. */
export interface Spy<T> {
  (this: T, ...args: any[]): any;
  originalFunc: Function;
  func: Function;
  /** Information about calls made to the function or instance method being spied on. */
  calls: SpyCall[];
  obj?: any;
  method?: string;
  restored?: boolean;
  /** Removes spy wrapper from instance method. */
  restore(): void;
}

function spyFactory(func: Function): Spy<void>;
function spyFactory<T>(func: Function, obj: T): Spy<T>;
function spyFactory<T>(func: Function, obj?: T): Spy<T> | Spy<void> {
  const calls: SpyCall[] = [];
  if (isSpy(func)) throw new SpyError("already spying on function");
  const spy: Spy<T> | Spy<void> = function (this: T | void) {
    const call: SpyCall = { args: [...arguments] };
    let returned: any;
    if (this) call.self = this;
    try {
      returned = spy.func.apply(this, arguments);
    } catch (error) {
      call.error = error;
      calls.push(call);
      throw error;
    }
    if (typeof returned !== "undefined") call.returned = returned;
    calls.push(call);
    return returned;
  } as Spy<T> | Spy<void>;
  applyInstanceMixins(spy, [SpyMixin]);
  if (obj) spy.obj = obj;
  spy.originalFunc = func;
  spy.func = func;
  spy.calls = calls;
  return spy;
}

/** Wraps a function or instance method with a Spy. */
function spy(): Spy<void>;
function spy(func: Function): Spy<void>;
function spy<T>(obj: T, method: string): Spy<T>;
function spy<T>(objOrFunc?: T | Function, method?: string): Spy<T> | Spy<void> {
  let spy: Spy<T> | Spy<void>;
  if (typeof method === "string") {
    spy = spyFactory((objOrFunc as any)[method], objOrFunc);
    spy.method = method;
    spy.restored = false;
    if (typeof spy.obj[method] !== "function") {
      throw new SpyError("instance method missing");
    }
    spy.obj[method] = spy;
  } else if (typeof objOrFunc === "function") {
    spy = spyFactory(objOrFunc);
  } else {
    spy = spyFactory(() => undefined);
  }
  return spy;
}

export { spy };

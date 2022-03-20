/** This module is browser compatible. */

/** An error related to spying on a function or instance method. */
export class MockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockError";
  }
}

/** Call information recorded by a spy. */
export interface SpyCall<
  Self = unknown,
  Args extends unknown[] = unknown[],
  Return = unknown,
> {
  /** Arguments passed to a function when called. */
  args: Args;
  /** The value that was returned by a function. */
  returned?: Return;
  /** The error value that was thrown by a function. */
  error?: Error;
  /** The instance that a method was called on. */
  self?: Self;
}

/** A function or instance method wrapper that records all calls made to it. */
export interface Spy<
  Self,
  Args extends unknown[],
  Return,
> {
  (this: Self, ...args: Args): Return;
  /** The function that is being spied on. */
  original: (this: Self, ...args: Args) => Return;
  /** Information about calls made to the function or instance method. */
  calls: SpyCall<Self, Args, Return>[];
  /** Whether or not the original instance method has been restored. */
  restored: boolean;
  /** If spying on an instance method, this restores the original instance method. */
  restore(): void;
}

/** Wraps a function with a Spy. */
function functionSpy<
  Self = unknown,
  Args extends unknown[] = unknown[],
  Return = undefined,
>(): Spy<Self, Args, Return>;
function functionSpy<
  Self,
  Args extends unknown[],
  Return,
>(func: (this: Self, ...args: Args) => Return): Spy<Self, Args, Return>;
function functionSpy<
  Self,
  Args extends unknown[],
  Return,
>(func?: (this: Self, ...args: Args) => Return): Spy<Self, Args, Return> {
  const original = func ?? (() => {}) as (this: Self, ...args: Args) => Return,
    calls: SpyCall<Self, Args, Return>[] = [];
  const spy = function (this: Self, ...args: Args): Return {
    const call: SpyCall<Self, Args, Return> = { args };
    if (this) call.self = this;
    try {
      call.returned = original.apply(this, args);
    } catch (error) {
      call.error = error;
      calls.push(call);
      throw error;
    }
    calls.push(call);
    return call.returned;
  } as Spy<Self, Args, Return>;
  Object.defineProperties(spy, {
    original: {
      enumerable: true,
      value: original,
    },
    calls: {
      enumerable: true,
      value: calls,
    },
    restored: {
      enumerable: true,
      get: () => false,
    },
    restore: {
      enumerable: true,
      value: () => {
        throw new MockError("function cannot be restored");
      },
    },
  });
  return spy;
}

/** Checks if a function is a spy. */
function isSpy<Self, Args extends unknown[], Return>(
  func: ((this: Self, ...args: Args) => Return) | unknown,
): func is Spy<Self, Args, Return> {
  const spy = func as Spy<Self, Args, Return>;
  return typeof spy === "function" &&
    typeof spy.original === "function" &&
    typeof spy.restored === "boolean" &&
    typeof spy.restore === "function" &&
    Array.isArray(spy.calls);
}

/** Wraps an instance method with a Spy. */
function methodSpy<
  Self,
  Args extends unknown[],
  Return,
>(self: Self, property: keyof Self): Spy<Self, Args, Return> {
  if (typeof self[property] !== "function") {
    throw new MockError("property is not an instance method");
  }
  if (isSpy(self[property])) {
    throw new MockError("already spying on instance method");
  }

  const propertyDescriptor = Object.getOwnPropertyDescriptor(self, property);
  if (propertyDescriptor && !propertyDescriptor.configurable) {
    throw new MockError("cannot spy on non configurable instance method");
  }

  const original = self[property] as unknown as (
      this: Self,
      ...args: Args
    ) => Return,
    calls: SpyCall<Self, Args, Return>[] = [];
  let restored = false;
  const spy = function (this: Self, ...args: Args): Return {
    const call: SpyCall<Self, Args, Return> = { args };
    if (this) call.self = this;
    try {
      call.returned = original.apply(this, args);
    } catch (error) {
      call.error = error;
      calls.push(call);
      throw error;
    }
    calls.push(call);
    return call.returned;
  } as Spy<Self, Args, Return>;
  Object.defineProperties(spy, {
    original: {
      enumerable: true,
      value: original,
    },
    calls: {
      enumerable: true,
      value: calls,
    },
    restored: {
      enumerable: true,
      get: () => restored,
    },
    restore: {
      enumerable: true,
      value: () => {
        if (restored) {
          throw new MockError("instance method already restored");
        }
        if (propertyDescriptor) {
          Object.defineProperty(self, property, propertyDescriptor);
        } else {
          delete self[property];
        }
        restored = true;
      },
    },
  });

  Object.defineProperty(self, property, {
    configurable: true,
    enumerable: propertyDescriptor?.enumerable,
    writable: propertyDescriptor?.writable,
    value: spy,
  });

  return spy;
}

/** Wraps a function or instance method with a Spy. */
export function spy<
  Self = unknown,
  Args extends unknown[] = unknown[],
  Return = unknown,
>(): Spy<Self, Args, Return>;
export function spy<
  Self,
  Args extends unknown[],
  Return,
>(func: (this: Self, ...args: Args) => Return): Spy<Self, Args, Return>;
export function spy<
  Self,
  Args extends unknown[],
  Return,
>(self: Self, property: keyof Self): Spy<Self, Args, Return>;
export function spy<
  Self,
  Args extends unknown[],
  Return,
>(
  funcOrSelf?: ((this: Self, ...args: Args) => Return) | Self,
  property?: keyof Self,
): Spy<Self, Args, Return> {
  return typeof property !== "undefined"
    ? methodSpy<Self, Args, Return>(funcOrSelf as Self, property)
    : typeof funcOrSelf === "function"
    ? functionSpy<Self, Args, Return>(
      funcOrSelf as (this: Self, ...args: Args) => Return,
    )
    : functionSpy<Self, Args, Return>();
}

// Create Stub interface that extends Spy to have fake
export interface Stub<
  Self,
  Args extends unknown[],
  Return,
> extends Spy<Self, Args, Return> {
  /** The function that is used instead of the original. */
  fake: (this: Self, ...args: Args) => Return;
}

/** Replaces an instance method with a Stub. */
export function stub<
  Self,
  Args extends unknown[] = unknown[],
  Return = undefined,
>(self: Self, property: keyof Self): Stub<Self, Args, Return>;
export function stub<
  Self,
  Args extends unknown[],
  Return,
>(
  self: Self,
  property: keyof Self,
  func: (this: Self, ...args: Args) => Return,
): Stub<Self, Args, Return>;
export function stub<
  Self,
  Args extends unknown[],
  Return,
>(
  self: Self,
  property: keyof Self,
  func?: (this: Self, ...args: Args) => Return,
): Stub<Self, Args, Return> {
  if (typeof self[property] !== "function") {
    throw new MockError("property is not an instance method");
  }
  if (isSpy(self[property])) {
    throw new MockError("already spying on instance method");
  }

  const propertyDescriptor = Object.getOwnPropertyDescriptor(self, property);
  if (propertyDescriptor && !propertyDescriptor.configurable) {
    throw new MockError("cannot spy on non configurable instance method");
  }

  const fake = func ?? (() => {}) as (this: Self, ...args: Args) => Return;

  const original = self[property] as unknown as (
      this: Self,
      ...args: Args
    ) => Return,
    calls: SpyCall<Self, Args, Return>[] = [];
  let restored = false;
  const stub = function (this: Self, ...args: Args): Return {
    const call: SpyCall<Self, Args, Return> = { args };
    if (this) call.self = this;
    try {
      call.returned = fake.apply(this, args);
    } catch (error) {
      call.error = error;
      calls.push(call);
      throw error;
    }
    calls.push(call);
    return call.returned;
  } as Stub<Self, Args, Return>;
  Object.defineProperties(stub, {
    original: {
      enumerable: true,
      value: original,
    },
    fake: {
      enumerable: true,
      value: fake,
    },
    calls: {
      enumerable: true,
      value: calls,
    },
    restored: {
      enumerable: true,
      get: () => restored,
    },
    restore: {
      enumerable: true,
      value: () => {
        if (restored) {
          throw new MockError("instance method already restored");
        }
        if (propertyDescriptor) {
          Object.defineProperty(self, property, propertyDescriptor);
        } else {
          delete self[property];
        }
        restored = true;
      },
    },
  });

  Object.defineProperty(self, property, {
    configurable: true,
    enumerable: propertyDescriptor?.enumerable,
    writable: propertyDescriptor?.writable,
    value: stub,
  });

  return stub;
}

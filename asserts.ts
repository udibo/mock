/** This module is browser compatible. */

import {
  assertEquals,
  AssertionError,
  assertStrictEquals,
  assertThrows,
  assertThrowsAsync,
} from "./deps.ts";
import { Spy, SpyCall, Stub, stub } from "./stub.ts";

export interface PassthroughTarget<T, U> {
  instance: U;
  method?: string | number | symbol;
  self?: ThisType<T> | ThisType<U>;
  // deno-lint-ignore no-explicit-any
  args?: any[];
  // deno-lint-ignore no-explicit-any
  returned?: any;
}

export interface PassthroughOptionsInstance<T, U> {
  instance: T;
  method: string | number | symbol;
  target: PassthroughTarget<T, U>;
  // deno-lint-ignore no-explicit-any
  args?: any[];
  // deno-lint-ignore no-explicit-any
  returned?: any;
}

export interface PassthroughOptionsFunc<T, U> {
  // deno-lint-ignore no-explicit-any
  func: (...args: any[]) => any;
  target: PassthroughTarget<T, U>;
  // deno-lint-ignore no-explicit-any
  args?: any[];
  // deno-lint-ignore no-explicit-any
  returned?: any;
}

export type PassthroughOptions<T, U> =
  | PassthroughOptionsInstance<T, U>
  | PassthroughOptionsFunc<T, U>;

/** Asserts that a function calls through to another function. */
export function assertPassthrough<T, U>(
  options: PassthroughOptions<T, U>,
): void {
  // deno-lint-ignore no-explicit-any
  const targetArgs: any[] = options.target.args ?? options.args ??
    [Symbol("arg1"), Symbol("arg2")];
  // deno-lint-ignore no-explicit-any
  const targetReturned: any = options.target.returned ?? options.returned ??
    Symbol("returned");
  // deno-lint-ignore no-explicit-any
  const passthroughArgs: any[] = options.args ?? targetArgs;
  // deno-lint-ignore no-explicit-any
  const passthroughReturned: any = options.returned ?? targetReturned;

  let target: Stub<U>;
  if ("method" in options.target || "method" in options) {
    target = stub(
      options.target.instance,
      options.target.method ??
        (options as PassthroughOptionsInstance<T, U>).method,
      () => targetReturned,
    );
  } else {
    throw new Error("target instance or passthrough must have method");
  }

  // deno-lint-ignore no-explicit-any
  let func: ((...args: any[]) => any);
  if ("instance" in options) {
    const instance: T = options.instance;
    const method: keyof T = options.method as keyof T;
    // deno-lint-ignore no-explicit-any
    func = instance[method] as unknown as ((...args: any[]) => any);
  } else {
    func = options.func;
  }
  if (typeof func !== "function") {
    throw new AssertionError("passthrough not a function");
  }
  try {
    assertEquals(
      func.apply(
        (options as PassthroughOptionsInstance<T, U>).instance ?? null,
        passthroughArgs,
      ),
      passthroughReturned,
    );
  } catch (e) {
    throw new AssertionError(
      "passthrough did not return expected value:\n" +
        e.message.split("\n").slice(1).join("\n"),
    );
  } finally {
    if ((options as PassthroughOptionsInstance<T, U>).instance) {
      target.restore();
    }
  }

  if ("self" in options.target) {
    try {
      assertStrictEquals(
        target.calls[0].self,
        options.target.self,
      );
    } catch (e) {
      throw new AssertionError(
        "target not called on expected self:\n" +
          e.message.split("\n").slice(1).join("\n"),
      );
    }
  }

  try {
    assertEquals(
      target.calls[0].args,
      targetArgs,
    );
  } catch (e) {
    throw new AssertionError(
      "target not called with expected args:\n" +
        e.message.split("\n").slice(1).join("\n"),
    );
  }
}

/**
 * Asserts that a spy is called as much as expected and no more.
 */
export function assertSpyCalls(
  // deno-lint-ignore no-explicit-any
  spy: Spy<any> | Stub<any>,
  expectedCalls: number,
) {
  try {
    assertEquals(spy.calls.length, expectedCalls);
  } catch (e) {
    let message = spy.calls.length < expectedCalls
      ? "spy not called as much as expected:\n"
      : "spy called more than expected:\n";
    message += e.message.split("\n").slice(1).join("\n");
    throw new AssertionError(message);
  }
}

/**
 * Asserts that a spy is called at least as much as expected.
 */
export function assertSpyCallsMin(
  // deno-lint-ignore no-explicit-any
  spy: Spy<any> | Stub<any>,
  expectedCalls: number,
) {
  if (spy.calls.length < expectedCalls) {
    throw new AssertionError("spy not called as much as expected");
  }
}

/** Call information recorded by a spy. */
export interface ExpectedSpyCall {
  /** Arguments passed to a function when called. */
  // deno-lint-ignore no-explicit-any
  args?: any[];
  /** The instance that a method was called on. */
  // deno-lint-ignore no-explicit-any
  self?: any;
  /**
   * The value that was returned by a function.
   * If you expect a promise to reject, expect error instead.
   */
  // deno-lint-ignore no-explicit-any
  returned?: any;
  error?: {
    /** The class for the error that was thrown by a function. */
    // deno-lint-ignore no-explicit-any
    Class?: any;
    /** Part of the message for the error that was thrown by a function. */
    msg?: string;
  };
}

/**
 * Asserts that a spy is called as expected.
 * Returns the call.
 */
export function assertSpyCall(
  // deno-lint-ignore no-explicit-any
  spy: Spy<any> | Stub<any>,
  callIndex: number,
  expected?: ExpectedSpyCall,
) {
  assertSpyCallsMin(spy, callIndex + 1);
  const call: SpyCall = spy.calls[callIndex];
  if (expected) {
    if (expected.args) {
      try {
        assertEquals(call.args, expected.args);
      } catch (e) {
        throw new AssertionError(
          "spy not called with expected args:\n" +
            e.message.split("\n").slice(1).join("\n"),
        );
      }
    }

    if ("self" in expected) {
      try {
        assertEquals(call.self, expected.self);
      } catch (e) {
        let message = expected.self
          ? "spy not called as method on expected self:\n"
          : "spy not expected to be called as method on object:\n";
        message += e.message.split("\n").slice(1).join("\n");
        throw new AssertionError(message);
      }
    }

    if ("returned" in expected) {
      if ("error" in expected) {
        throw new TypeError(
          "do not expect error and return, only one should be expected",
        );
      }
      if (call.error) {
        throw new AssertionError(
          "spy call did not return expected value, an error was thrown.",
        );
      }
      try {
        assertEquals(call.returned, expected.returned);
      } catch (e) {
        throw new AssertionError(
          "spy call did not return expected value:\n" +
            e.message.split("\n").slice(1).join("\n"),
        );
      }
    }

    if ("error" in expected) {
      if ("returned" in call) {
        throw new AssertionError(
          "spy call did not throw an error, a value was returned.",
        );
      }
      assertThrows(
        () => {
          throw call.error;
        },
        expected.error?.Class ?? Error,
        expected.error?.msg ?? "",
      );
    }
  }
  return call;
}

/**
 * Asserts that an async spy is called as expected.
 * Returns the call.
 */
export async function assertSpyCallAsync(
  // deno-lint-ignore no-explicit-any
  spy: Spy<any> | Stub<any>,
  callIndex: number,
  expected?: ExpectedSpyCall,
) {
  const expectedSync = expected && { ...expected };
  if (expectedSync) {
    delete expectedSync.returned;
    delete expectedSync.error;
  }
  const call: SpyCall = assertSpyCall(
    spy,
    callIndex,
    expectedSync,
  );

  if (call.error) {
    throw new AssertionError(
      "spy call did not return a promise, an error was thrown.",
    );
  }
  if (call.returned !== Promise.resolve(call.returned)) {
    throw new AssertionError(
      "spy call did not return a promise, a value was returned.",
    );
  }

  if (expected) {
    if ("returned" in expected) {
      if ("error" in expected) {
        throw new TypeError(
          "do not expect error and return, only one should be expected",
        );
      }
      if (call.error) {
        throw new AssertionError(
          "spy call did not return expected value, an error was thrown.",
        );
      }
      let expectedResolved;
      try {
        expectedResolved = await expected.returned;
      } catch {
        throw new TypeError(
          "do not expect rejected promise, expect error instead",
        );
      }

      let resolved;
      try {
        resolved = await call.returned;
      } catch {
        throw new AssertionError("spy call returned promise was rejected");
      }

      try {
        assertEquals(resolved, expectedResolved);
      } catch (e) {
        throw new AssertionError(
          "spy call did not resolve to expected value:\n" +
            e.message.split("\n").slice(1).join("\n"),
        );
      }
    }

    if ("error" in expected) {
      await assertThrowsAsync(
        () => call.returned,
        expected.error?.Class ?? Error,
        expected.error?.msg ?? "",
      );
    }
  }
  return call;
}

/**
 * Asserts that a spy is called with a specific arg as expected.
 * Returns the actual arg.
 */
export function assertSpyCallArg(
  // deno-lint-ignore no-explicit-any
  spy: Spy<any> | Stub<any>,
  callIndex: number,
  argIndex: number,
  // deno-lint-ignore no-explicit-any
  expected: any,
  // deno-lint-ignore no-explicit-any
): any {
  const call: SpyCall = assertSpyCall(spy, callIndex);
  const arg = call.args[argIndex];
  assertEquals(arg, expected);
  return arg;
}

/**
 * Asserts that an spy is called with a specific range of args as expected.
 * If a start and end index is not provided, the expected will be compared against all args.
 * If a start is provided without an end index, the expected will be compared against all args from the start index to the end.
 * The end index is not included in the range of args that are compared.
 * Returns the actual args.
 */
function assertSpyCallArgs(
  // deno-lint-ignore no-explicit-any
  spy: Spy<any> | Stub<any>,
  callIndex: number,
  // deno-lint-ignore no-explicit-any
  expected: any[],
  // deno-lint-ignore no-explicit-any
): any[];
function assertSpyCallArgs(
  // deno-lint-ignore no-explicit-any
  spy: Spy<any> | Stub<any>,
  callIndex: number,
  argsStart: number,
  // deno-lint-ignore no-explicit-any
  expected: any[],
  // deno-lint-ignore no-explicit-any
): any[];
function assertSpyCallArgs(
  // deno-lint-ignore no-explicit-any
  spy: Spy<any> | Stub<any>,
  callIndex: number,
  argStart: number,
  argEnd: number,
  // deno-lint-ignore no-explicit-any
  expected: any[],
  // deno-lint-ignore no-explicit-any
): any[];
function assertSpyCallArgs(
  // deno-lint-ignore no-explicit-any
  spy: Spy<any> | Stub<any>,
  callIndex: number,
  // deno-lint-ignore no-explicit-any
  argsStart?: number | any[],
  // deno-lint-ignore no-explicit-any
  argsEnd?: number | any[],
  // deno-lint-ignore no-explicit-any
  expected?: any[],
  // deno-lint-ignore no-explicit-any
): any[] {
  const call: SpyCall = assertSpyCall(spy, callIndex);
  if (!expected) {
    // deno-lint-ignore no-explicit-any
    expected = argsEnd as any[];
    argsEnd = undefined;
  }
  if (!expected) {
    // deno-lint-ignore no-explicit-any
    expected = argsStart as any[];
    argsStart = undefined;
  }
  const args = typeof argsEnd === "number"
    ? call.args.slice(argsStart as number, argsEnd)
    : typeof argsStart === "number"
    ? call.args.slice(argsStart)
    : call.args;
  assertEquals(args, expected);
  return args;
}

export { assertSpyCallArgs };

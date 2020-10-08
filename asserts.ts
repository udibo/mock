/** This module is browser compatible. */

import {
  assertEquals,
  AssertionError,
  assertStrictEquals,
} from "./deps/std/testing/asserts.ts";
import { Spy, spy, stub } from "./stub.ts";

interface PassthroughTarget<T, U> {
  instance: U;
  method?: string | number | symbol;
  self?: ThisType<T> | ThisType<U>;
  // deno-lint-ignore no-explicit-any
  args?: any[];
  // deno-lint-ignore no-explicit-any
  returned?: any;
}

interface PassthroughOptionsInstance<T, U> {
  instance: T;
  method: string | number | symbol;
  target: PassthroughTarget<T, U>;
  // deno-lint-ignore no-explicit-any
  args?: any[];
  // deno-lint-ignore no-explicit-any
  returned?: any;
}
interface PassthroughOptionsFunc<T, U> {
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

  let target: Spy<U>;
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

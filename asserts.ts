/** This module is browser compatible. */

import {
  assertEquals,
  assertStrictEquals,
  AssertionError,
} from "./deps/std/testing/asserts.ts";
import { spy, Spy, stub } from "./stub.ts";

interface PassthroughTarget<T, U> {
  instance: U;
  method?: string | number | symbol;
  self?: ThisType<T> | ThisType<U>;
  args?: any[];
  returned?: any;
}

interface PassthroughOptionsInstance<T, U> {
  instance: T;
  method: string | number | symbol;
  target: PassthroughTarget<T, U>;
  args?: any[];
  returned?: any;
}
interface PassthroughOptionsFunc<T, U> {
  func: Function;
  target: PassthroughTarget<T, U>;
  args?: any[];
  returned?: any;
}
export type PassthroughOptions<T, U> =
  | PassthroughOptionsInstance<T, U>
  | PassthroughOptionsFunc<T, U>;

export function assertPassthrough<T, U>(
  options: PassthroughOptions<T, U>,
): void {
  const targetArgs: any[] = options.target.args ?? options.args ??
    [Symbol("arg1"), Symbol("arg2")];
  const targetReturned: any = options.target.returned ?? options.returned ??
    Symbol("returned");
  const passthroughArgs: any[] = options.args ?? targetArgs;
  const passthroughReturned: any = options.returned ?? targetReturned;

  let target: Spy<any>;
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

  let func: T[keyof T] | Function;
  if ("instance" in options) {
    const instance: T = options.instance;
    const method: keyof T = options.method as keyof T;
    func = instance[method];
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

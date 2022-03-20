/** This module is browser compatible. */

import { MockError } from "./mock.ts";

/** Creates a function that returns the instance the method was called on. */
export function returnsThis<
  Self = unknown,
  Args extends unknown[] = unknown[],
>(): (this: Self, ...args: Args) => Self {
  return function (this: Self): Self {
    return this;
  };
}

/** Creates a function that returns one of its arguments. */
export function returnsArg<Arg, Self = unknown>(
  idx: number,
): (this: Self, ...args: Arg[]) => Arg {
  return function (...args: Arg[]): Arg {
    return args[idx];
  };
}

/** Creates a function that returns its arguments or a subset of them. If end is specified, it will return arguments up to but not including the end. */
export function returnsArgs<
  Args extends unknown[],
  Self = unknown,
>(
  start = 0,
  end?: number,
): (this: Self, ...args: Args) => Args {
  return function (this: Self, ...args: Args): Args {
    return args.slice(start, end) as Args;
  };
}

/** Creates a function that returns the iterable values. Any iterable values that are errors will be thrown. */
export function returnsNext<
  Return,
  Self = unknown,
  Args extends unknown[] = unknown[],
>(
  values: Iterable<Return | Error>,
): (this: Self, ...args: Args) => Return {
  const gen = (function* returnsValue() {
    yield* values;
  })();
  let calls = 0;
  return function () {
    const next = gen.next();
    if (next.done) {
      throw new MockError(`not expected to be called more than ${calls} times`);
    }
    calls++;
    const { value } = next;
    if (value instanceof Error) throw value;
    return value;
  };
}

/** Creates a function that resolves the awaited iterable values. Any awaited iterable values that are errors will be thrown. */
export function resolvesNext<
  Return,
  Self = unknown,
  Args extends unknown[] = unknown[],
>(
  iterable:
    | Iterable<Return | Error | Promise<Return | Error>>
    | AsyncIterable<Return | Error | Promise<Return | Error>>,
): (this: Self, ...args: Args) => Promise<Return> {
  const gen = (async function* returnsValue() {
    yield* iterable;
  })();
  let calls = 0;
  return async function () {
    const next = await gen.next();
    if (next.done) {
      throw new MockError(`not expected to be called more than ${calls} times`);
    }
    calls++;
    const { value } = next;
    if (value instanceof Error) throw value;
    return value;
  };
}

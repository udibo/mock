import { AssertionError, assertThrows, assertThrowsAsync } from "./deps.ts";
import {
  assertPassthrough,
  assertSpyCall,
  assertSpyCallArg,
  assertSpyCallArgs,
  assertSpyCallAsync,
  assertSpyCalls,
  assertSpyCallsMin,
  PassthroughOptions,
} from "./asserts.ts";
import { Point } from "./test_shared.ts";
import { Spy, spy } from "./spy.ts";
import { Stub, stub } from "./stub.ts";

Deno.test("assertPassthrough function", () => {
  const point: Point = new Point(2, 3);
  const point2: Point = new Point(3, 4);
  const callToString: (point: Point) => string = (point: Point) => {
    return point.toString();
  };

  assertPassthrough({
    func: callToString,
    args: [point],
    returned: "6, 7",
    target: {
      instance: point,
      method: "toString",
      self: point,
      args: [],
      returned: "6, 7",
    },
  });
  assertThrows(
    () =>
      assertPassthrough({
        func: callToString,
        args: [point],
        returned: "2, 3",
        target: {
          instance: point,
          method: "toString",
          args: [point],
          returned: "6, 7",
        },
      }),
    AssertionError,
    "passthrough did not return expected value",
  );
  assertThrows(
    () =>
      assertPassthrough({
        func: callToString,
        args: [point],
        returned: "6, 7",
        target: {
          instance: point,
          method: "toString",
          self: point2,
          args: [],
          returned: "6, 7",
        },
      }),
    AssertionError,
    "target not called on expected self",
  );
  assertThrows(
    () =>
      assertPassthrough({
        func: callToString,
        args: [point],
        returned: "6, 7",
        target: {
          instance: point,
          method: "toString",
          args: [5, 6],
          returned: "6, 7",
        },
      }),
    AssertionError,
    "target not called with expected args",
  );
  assertThrows(
    () =>
      assertPassthrough({
        func: callToString,
        args: [5, 8],
        returned: "6, 7",
        target: {
          instance: point,
          method: "toString",
          args: [point],
          returned: "6, 7",
        },
      }),
    AssertionError,
    "passthrough did not return expected value",
  );
});

Deno.test("assertPassthrough instance", () => {
  const point: Point = new Point(2, 3);
  const point2: Point = new Point(3, 4);
  const callAction: (a: number, b: number) => number = (
    a: number,
    b: number,
  ) => {
    return 3 * point.action.call(point2, a * 2, b * 2);
  };
  const fakePoint: Partial<Point> = { action: callAction };

  assertPassthrough({
    instance: fakePoint,
    method: "action",
    args: [5, 8],
    returned: 9,
    target: {
      instance: point,
      self: point2,
      args: [10, 16],
      returned: 3,
    },
  });
  assertThrows(
    () =>
      assertPassthrough({
        instance: fakePoint,
        method: "action",
        args: [5, 8],
        returned: 15,
        target: {
          instance: point,
          self: point2,
          args: [10, 16],
          returned: 3,
        },
      }),
    AssertionError,
    "passthrough did not return expected value",
  );
  assertThrows(
    () =>
      assertPassthrough({
        instance: fakePoint,
        method: "action",
        args: [5, 8],
        returned: 9,
        target: {
          instance: point,
          self: point,
          args: [10, 16],
          returned: 3,
        },
      }),
    AssertionError,
    "target not called on expected self",
  );
  assertThrows(
    () =>
      assertPassthrough({
        instance: fakePoint,
        method: "action",
        args: [5, 8],
        returned: 9,
        target: {
          instance: point,
          self: point2,
          args: [19, 16],
          returned: 3,
        },
      }),
    AssertionError,
    "target not called with expected args",
  );
  assertThrows(
    () =>
      assertPassthrough({
        instance: fakePoint,
        method: "action",
        target: {
          instance: point,
          self: point2,
        },
      }),
    AssertionError,
    "passthrough did not return expected value",
  );
  assertThrows(
    () =>
      assertPassthrough({
        instance: fakePoint,
        args: [5, 8],
        returned: 9,
        target: {
          instance: point,
          self: point2,
          args: [10, 16],
          returned: 3,
        },
      } as unknown as PassthroughOptions<Partial<Point>, Point>),
    Error,
    "target instance or passthrough must have method",
  );
  assertThrows(
    () =>
      assertPassthrough({
        instance: fakePoint,
        method: "invalid",
        args: [5, 8],
        returned: 9,
        target: {
          instance: point,
          self: point2,
          args: [10, 16],
          returned: 3,
        },
      }),
    Error,
    "passthrough not a function",
  );
});

Deno.test("assertSpyCalls", () => {
  const spyFunc: Spy<void> = spy();

  assertSpyCalls(spyFunc, 0);
  assertThrows(
    () => assertSpyCalls(spyFunc, 1),
    AssertionError,
    "spy not called as much as expected",
  );

  spyFunc();
  assertSpyCalls(spyFunc, 1);
  assertThrows(
    () => assertSpyCalls(spyFunc, 0),
    AssertionError,
    "spy called more than expected",
  );
  assertThrows(
    () => assertSpyCalls(spyFunc, 2),
    AssertionError,
    "spy not called as much as expected",
  );
});

Deno.test("assertSpyCallsMin", () => {
  const spyFunc: Spy<void> = spy();

  assertSpyCallsMin(spyFunc, 0);
  assertThrows(
    () => assertSpyCallsMin(spyFunc, 1),
    AssertionError,
    "spy not called as much as expected",
  );

  spyFunc();
  assertSpyCallsMin(spyFunc, 1);
  assertThrows(
    () => assertSpyCallsMin(spyFunc, 2),
    AssertionError,
    "spy not called as much as expected",
  );
});

Deno.test("assertSpyCall function", () => {
  const spyFunc: Spy<void> = spy(() => 5);

  assertThrows(
    () => assertSpyCall(spyFunc, 0),
    AssertionError,
    "spy not called as much as expected",
  );

  spyFunc();
  assertSpyCall(spyFunc, 0);
  assertSpyCall(spyFunc, 0, {
    args: [],
    self: undefined,
    returned: 5,
  });
  assertSpyCall(spyFunc, 0, {
    args: [],
  });
  assertSpyCall(spyFunc, 0, {
    self: undefined,
  });
  assertSpyCall(spyFunc, 0, {
    returned: 5,
  });

  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        args: [1],
        self: {},
        returned: 2,
      }),
    AssertionError,
    "spy not called with expected args",
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        args: [1],
      }),
    AssertionError,
    "spy not called with expected args",
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        self: {},
      }),
    AssertionError,
    "spy not called as method on expected self",
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        returned: 2,
      }),
    AssertionError,
    "spy call did not return expected value",
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        error: { msg: "x" },
      }),
    AssertionError,
    "spy call did not throw an error, a value was returned.",
  );
  assertThrows(
    () => assertSpyCall(spyFunc, 1),
    AssertionError,
    "spy not called as much as expected",
  );
});

Deno.test("assertSpyCall method", () => {
  const point: Point = new Point(2, 3);
  const spyMethod: Spy<Point> = spy(point, "action");

  assertThrows(
    () => assertSpyCall(spyMethod, 0),
    AssertionError,
    "spy not called as much as expected",
  );

  point.action(3, 7);
  assertSpyCall(spyMethod, 0);
  assertSpyCall(spyMethod, 0, {
    args: [3, 7],
    self: point,
    returned: 3,
  });
  assertSpyCall(spyMethod, 0, {
    args: [3, 7],
  });
  assertSpyCall(spyMethod, 0, {
    self: point,
  });
  assertSpyCall(spyMethod, 0, {
    returned: 3,
  });

  assertThrows(
    () =>
      assertSpyCall(spyMethod, 0, {
        args: [7, 4],
        self: undefined,
        returned: 7,
      }),
    AssertionError,
    "spy not called with expected args",
  );
  assertThrows(
    () =>
      assertSpyCall(spyMethod, 0, {
        args: [7, 3],
      }),
    AssertionError,
    "spy not called with expected args",
  );
  assertThrows(
    () =>
      assertSpyCall(spyMethod, 0, {
        self: undefined,
      }),
    AssertionError,
    "spy not expected to be called as method on object",
  );
  assertThrows(
    () =>
      assertSpyCall(spyMethod, 0, {
        returned: 7,
      }),
    AssertionError,
    "spy call did not return expected value",
  );
  assertThrows(
    () => assertSpyCall(spyMethod, 1),
    AssertionError,
    "spy not called as much as expected",
  );

  spyMethod(9);
  assertSpyCall(spyMethod, 1);
  assertSpyCall(spyMethod, 1, {
    args: [9],
    self: undefined,
    returned: 9,
  });
  assertSpyCall(spyMethod, 1, {
    args: [9],
  });
  assertSpyCall(spyMethod, 1, {
    self: undefined,
  });
  assertSpyCall(spyMethod, 1, {
    returned: 9,
  });

  assertThrows(
    () =>
      assertSpyCall(spyMethod, 1, {
        args: [7, 4],
        self: point,
        returned: 7,
      }),
    AssertionError,
    "spy not called with expected args",
  );
  assertThrows(
    () =>
      assertSpyCall(spyMethod, 1, {
        args: [7, 3],
      }),
    AssertionError,
    "spy not called with expected args",
  );
  assertThrows(
    () =>
      assertSpyCall(spyMethod, 1, {
        self: point,
      }),
    AssertionError,
    "spy not called as method on expected self",
  );
  assertThrows(
    () =>
      assertSpyCall(spyMethod, 1, {
        returned: 7,
      }),
    AssertionError,
    "spy call did not return expected value",
  );
  assertThrows(
    () =>
      assertSpyCall(spyMethod, 1, {
        error: { msg: "x" },
      }),
    AssertionError,
    "spy call did not throw an error, a value was returned.",
  );
  assertThrows(
    () => assertSpyCall(spyMethod, 2),
    AssertionError,
    "spy not called as much as expected",
  );
});

class ExampleError extends Error {}
class OtherError extends Error {}

Deno.test("assertSpyCall error", () => {
  const spyFunc: Spy<void> = spy(() => {
    throw new ExampleError("failed");
  });

  assertThrows(() => spyFunc(), ExampleError, "fail");
  assertSpyCall(spyFunc, 0);
  assertSpyCall(spyFunc, 0, {
    args: [],
    self: undefined,
    error: {
      Class: ExampleError,
      msg: "fail",
    },
  });
  assertSpyCall(spyFunc, 0, {
    args: [],
  });
  assertSpyCall(spyFunc, 0, {
    self: undefined,
  });
  assertSpyCall(spyFunc, 0, {
    error: {
      Class: ExampleError,
      msg: "fail",
    },
  });
  assertSpyCall(spyFunc, 0, {
    error: {
      Class: Error,
      msg: "fail",
    },
  });

  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        args: [1],
        self: {},
        error: {
          Class: OtherError,
          msg: "fail",
        },
      }),
    AssertionError,
    "spy not called with expected args",
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        args: [1],
      }),
    AssertionError,
    "spy not called with expected args",
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        self: {},
      }),
    AssertionError,
    "spy not called as method on expected self",
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        error: {
          Class: OtherError,
          msg: "fail",
        },
      }),
    AssertionError,
    'Expected error to be instance of "OtherError", but was "ExampleError".',
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        error: {
          Class: OtherError,
          msg: "x",
        },
      }),
    AssertionError,
    'Expected error to be instance of "OtherError", but was "ExampleError".',
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        error: {
          Class: ExampleError,
          msg: "x",
        },
      }),
    AssertionError,
    'Expected error message to include "x", but got "failed".',
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        error: {
          Class: Error,
          msg: "x",
        },
      }),
    AssertionError,
    'Expected error message to include "x", but got "failed".',
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        error: {
          msg: "x",
        },
      }),
    AssertionError,
    'Expected error message to include "x", but got "failed".',
  );
  assertThrows(
    () =>
      assertSpyCall(spyFunc, 0, {
        returned: 7,
      }),
    AssertionError,
    "spy call did not return expected value, an error was thrown.",
  );
  assertThrows(
    () => assertSpyCall(spyFunc, 1),
    AssertionError,
    "spy not called as much as expected",
  );
});

Deno.test("assertSpyCallAsync function", async () => {
  const spyFunc: Spy<void> = spy(() => Promise.resolve(5));

  await assertThrowsAsync(
    () => assertSpyCallAsync(spyFunc, 0),
    AssertionError,
    "spy not called as much as expected",
  );

  await spyFunc();
  await assertSpyCallAsync(spyFunc, 0);
  await assertSpyCallAsync(spyFunc, 0, {
    args: [],
    self: undefined,
    returned: 5,
  });
  await assertSpyCallAsync(spyFunc, 0, {
    args: [],
    self: undefined,
    returned: Promise.resolve(5),
  });
  await assertSpyCallAsync(spyFunc, 0, {
    args: [],
  });
  await assertSpyCallAsync(spyFunc, 0, {
    self: undefined,
  });
  await assertSpyCallAsync(spyFunc, 0, {
    returned: Promise.resolve(5),
  });

  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        args: [1],
        self: {},
        returned: 2,
      }),
    AssertionError,
    "spy not called with expected args",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        args: [1],
      }),
    AssertionError,
    "spy not called with expected args",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        self: {},
      }),
    AssertionError,
    "spy not called as method on expected self",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        returned: 2,
      }),
    AssertionError,
    "spy call did not resolve to expected value",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        returned: Promise.resolve(2),
      }),
    AssertionError,
    "spy call did not resolve to expected value",
  );
  await assertThrowsAsync(
    () => assertSpyCallAsync(spyFunc, 1),
    AssertionError,
    "spy not called as much as expected",
  );
});

Deno.test("assertSpyCallAsync method", async () => {
  const point: Point = new Point(2, 3);
  const spyMethod: Stub<Point> = stub(
    point,
    "action",
    (x?: number) => Promise.resolve(x),
  );

  await assertThrowsAsync(
    () => assertSpyCallAsync(spyMethod, 0),
    AssertionError,
    "spy not called as much as expected",
  );

  await point.action(3, 7);
  await assertSpyCallAsync(spyMethod, 0);
  await assertSpyCallAsync(spyMethod, 0, {
    args: [3, 7],
    self: point,
    returned: 3,
  });
  await assertSpyCallAsync(spyMethod, 0, {
    args: [3, 7],
    self: point,
    returned: Promise.resolve(3),
  });
  await assertSpyCallAsync(spyMethod, 0, {
    args: [3, 7],
  });
  await assertSpyCallAsync(spyMethod, 0, {
    self: point,
  });
  await assertSpyCallAsync(spyMethod, 0, {
    returned: 3,
  });
  await assertSpyCallAsync(spyMethod, 0, {
    returned: Promise.resolve(3),
  });

  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyMethod, 0, {
        args: [7, 4],
        self: undefined,
        returned: 7,
      }),
    AssertionError,
    "spy not called with expected args",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyMethod, 0, {
        args: [7, 3],
      }),
    AssertionError,
    "spy not called with expected args",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyMethod, 0, {
        self: undefined,
      }),
    AssertionError,
    "spy not expected to be called as method on object",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyMethod, 0, {
        returned: 7,
      }),
    AssertionError,
    "spy call did not resolve to expected value",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyMethod, 0, {
        returned: Promise.resolve(7),
      }),
    AssertionError,
    "spy call did not resolve to expected value",
  );
  await assertThrowsAsync(
    () => assertSpyCallAsync(spyMethod, 1),
    AssertionError,
    "spy not called as much as expected",
  );

  await spyMethod(9);
  await assertSpyCallAsync(spyMethod, 1);
  await assertSpyCallAsync(spyMethod, 1, {
    args: [9],
    self: undefined,
    returned: 9,
  });
  await assertSpyCallAsync(spyMethod, 1, {
    args: [9],
    self: undefined,
    returned: Promise.resolve(9),
  });
  await assertSpyCallAsync(spyMethod, 1, {
    args: [9],
  });
  await assertSpyCallAsync(spyMethod, 1, {
    self: undefined,
  });
  await assertSpyCallAsync(spyMethod, 1, {
    returned: 9,
  });
  await assertSpyCallAsync(spyMethod, 1, {
    returned: Promise.resolve(9),
  });

  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyMethod, 1, {
        args: [7, 4],
        self: point,
        returned: 7,
      }),
    AssertionError,
    "spy not called with expected args",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyMethod, 1, {
        args: [7, 3],
      }),
    AssertionError,
    "spy not called with expected args",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyMethod, 1, {
        self: point,
      }),
    AssertionError,
    "spy not called as method on expected self",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyMethod, 1, {
        returned: 7,
      }),
    AssertionError,
    "spy call did not resolve to expected value",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyMethod, 1, {
        returned: Promise.resolve(7),
      }),
    AssertionError,
    "spy call did not resolve to expected value",
  );
  await assertThrowsAsync(
    () => assertSpyCallAsync(spyMethod, 2),
    AssertionError,
    "spy not called as much as expected",
  );
});

Deno.test("assertSpyCallAync on sync value", async () => {
  const spyFunc: Spy<void> = spy(() => 4);

  await spyFunc();
  await assertThrowsAsync(
    () => assertSpyCallAsync(spyFunc, 0),
    AssertionError,
    "spy call did not return a promise, a value was returned.",
  );
});

Deno.test("assertSpyCallAync on sync error", async () => {
  const spyFunc: Spy<void> = spy(() => {
    throw new ExampleError("failed");
  });

  await assertThrowsAsync(() => spyFunc(), ExampleError, "fail");
  await assertThrowsAsync(
    () => assertSpyCallAsync(spyFunc, 0),
    AssertionError,
    "spy call did not return a promise, an error was thrown.",
  );
});

Deno.test("assertSpyCallAync error", async () => {
  const spyFunc: Spy<void> = spy(() =>
    Promise.reject(new ExampleError("failed"))
  );

  await assertThrowsAsync(() => spyFunc(), ExampleError, "fail");
  await assertSpyCallAsync(spyFunc, 0);
  await assertSpyCallAsync(spyFunc, 0, {
    args: [],
    self: undefined,
    error: {
      Class: ExampleError,
      msg: "fail",
    },
  });
  await assertSpyCallAsync(spyFunc, 0, {
    args: [],
  });
  await assertSpyCallAsync(spyFunc, 0, {
    self: undefined,
  });
  await assertSpyCallAsync(spyFunc, 0, {
    error: {
      Class: ExampleError,
      msg: "fail",
    },
  });
  await assertSpyCallAsync(spyFunc, 0, {
    error: {
      Class: Error,
      msg: "fail",
    },
  });

  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        args: [1],
        self: {},
        error: {
          Class: OtherError,
          msg: "fail",
        },
      }),
    AssertionError,
    "spy not called with expected args",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        args: [1],
      }),
    AssertionError,
    "spy not called with expected args",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        self: {},
      }),
    AssertionError,
    "spy not called as method on expected self",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        error: {
          Class: OtherError,
          msg: "fail",
        },
      }),
    AssertionError,
    'Expected error to be instance of "OtherError"',
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        error: {
          Class: OtherError,
          msg: "x",
        },
      }),
    AssertionError,
    'Expected error to be instance of "OtherError"',
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        error: {
          Class: ExampleError,
          msg: "x",
        },
      }),
    AssertionError,
    'Expected error message to include "x", but got "failed".',
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        error: {
          Class: Error,
          msg: "x",
        },
      }),
    AssertionError,
    'Expected error message to include "x", but got "failed".',
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        error: {
          msg: "x",
        },
      }),
    AssertionError,
    'Expected error message to include "x", but got "failed".',
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        returned: 7,
      }),
    AssertionError,
    "spy call returned promise was rejected",
  );
  await assertThrowsAsync(
    () =>
      assertSpyCallAsync(spyFunc, 0, {
        returned: 7,
        error: { msg: "x" },
      }),
    TypeError,
    "do not expect error and return, only one should be expected",
  );
  await assertThrowsAsync(
    () => assertSpyCallAsync(spyFunc, 1),
    AssertionError,
    "spy not called as much as expected",
  );
});

Deno.test("assertSpyArg", () => {
  const spyFunc: Spy<void> = spy();

  assertThrows(
    () => assertSpyCallArg(spyFunc, 0, 0, undefined),
    AssertionError,
    "spy not called as much as expected",
  );

  spyFunc();
  assertSpyCallArg(spyFunc, 0, 0, undefined);
  assertSpyCallArg(spyFunc, 0, 1, undefined);
  assertThrows(
    () => assertSpyCallArg(spyFunc, 0, 0, 2),
    AssertionError,
    "Values are not equal:",
  );

  spyFunc(7, 9);
  assertSpyCallArg(spyFunc, 1, 0, 7);
  assertSpyCallArg(spyFunc, 1, 1, 9);
  assertSpyCallArg(spyFunc, 1, 2, undefined);
  assertThrows(
    () => assertSpyCallArg(spyFunc, 0, 0, 9),
    AssertionError,
    "Values are not equal:",
  );
  assertThrows(
    () => assertSpyCallArg(spyFunc, 0, 1, 7),
    AssertionError,
    "Values are not equal:",
  );
  assertThrows(
    () => assertSpyCallArg(spyFunc, 0, 2, 7),
    AssertionError,
    "Values are not equal:",
  );
});

Deno.test("assertSpyArgs without range", () => {
  const spyFunc: Spy<void> = spy();

  assertThrows(
    () => assertSpyCallArgs(spyFunc, 0, []),
    AssertionError,
    "spy not called as much as expected",
  );

  spyFunc();
  assertSpyCallArgs(spyFunc, 0, []);
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 0, [undefined]),
    AssertionError,
    "Values are not equal:",
  );
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 0, [2]),
    AssertionError,
    "Values are not equal:",
  );

  spyFunc(7, 9);
  assertSpyCallArgs(spyFunc, 1, [7, 9]);
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 1, [7, 9, undefined]),
    AssertionError,
    "Values are not equal:",
  );
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 1, [9, 7]),
    AssertionError,
    "Values are not equal:",
  );
});

Deno.test("assertSpyArgs with start only", () => {
  const spyFunc: Spy<void> = spy();

  assertThrows(
    () => assertSpyCallArgs(spyFunc, 0, 1, []),
    AssertionError,
    "spy not called as much as expected",
  );

  spyFunc();
  assertSpyCallArgs(spyFunc, 0, 1, []);
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 0, 1, [undefined]),
    AssertionError,
    "Values are not equal:",
  );
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 0, 1, [2]),
    AssertionError,
    "Values are not equal:",
  );

  spyFunc(7, 9, 8);
  assertSpyCallArgs(spyFunc, 1, 1, [9, 8]);
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 1, 1, [9, 8, undefined]),
    AssertionError,
    "Values are not equal:",
  );
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 1, 1, [9, 7]),
    AssertionError,
    "Values are not equal:",
  );
});

Deno.test("assertSpyArgs with range", () => {
  const spyFunc: Spy<void> = spy();

  assertThrows(
    () => assertSpyCallArgs(spyFunc, 0, 1, 3, []),
    AssertionError,
    "spy not called as much as expected",
  );

  spyFunc();
  assertSpyCallArgs(spyFunc, 0, 1, 3, []);
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 0, 1, 3, [undefined, undefined]),
    AssertionError,
    "Values are not equal:",
  );
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 0, 1, 3, [2, 4]),
    AssertionError,
    "Values are not equal:",
  );

  spyFunc(7, 9, 8, 5, 6);
  assertSpyCallArgs(spyFunc, 1, 1, 3, [9, 8]);
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 1, 1, 3, [9, 8, undefined]),
    AssertionError,
    "Values are not equal:",
  );
  assertThrows(
    () => assertSpyCallArgs(spyFunc, 1, 1, 3, [9, 7]),
    AssertionError,
    "Values are not equal:",
  );
});

import {
  assertEquals,
  assertNotEquals,
  assertThrows,
  assertThrowsAsync,
} from "./deps/std/testing/asserts.ts";
import { SpyCall, SpyError, Stub, stub } from "./stub.ts";
import { Point } from "./test_shared.ts";

Deno.test("stub default", () => {
  const point = new Point(2, 3);
  const func: Stub<Point> = stub(point, "action");
  const action: Stub<void> = func as unknown as Stub<void>;
  const expectedCalls: SpyCall[] = [];
  try {
    assertEquals(func.calls, expectedCalls);

    assertEquals(action(), undefined);
    expectedCalls.push({ args: [] });
    assertEquals(func.calls, expectedCalls);
    assertEquals(point.action(), undefined);
    expectedCalls.push({ self: point, args: [] });
    assertEquals(func.calls, expectedCalls);

    func.returns = [null, 0];
    assertEquals(action(), null);
    expectedCalls.push({ returned: null, args: [] });
    assertEquals(func.calls, expectedCalls);
    assertEquals(point.action(), 0);
    expectedCalls.push({ returned: 0, self: point, args: [] });
    assertEquals(func.calls, expectedCalls);
    assertEquals(point.action(), undefined);
    expectedCalls.push({ self: point, args: [] });
    assertEquals(func.calls, expectedCalls);

    func.returns = ["y", "z"];
    assertEquals(action("x"), "y");
    expectedCalls.push({ returned: "y", args: ["x"] });
    assertEquals(func.calls, expectedCalls);
    assertEquals(point.action("x"), "z");
    expectedCalls.push({ self: point, returned: "z", args: ["x"] });
    assertEquals(func.calls, expectedCalls);
    assertEquals(point.action("x"), undefined);
    expectedCalls.push({ self: point, args: ["x"] });
    assertEquals(func.calls, expectedCalls);

    assertNotEquals(func, Point.prototype.action);
    assertEquals(point.action, func);
  } finally {
    func.restore();
  }
  assertEquals(point.action, Point.prototype.action);
  assertThrows(
    () => func.restore(),
    SpyError,
    "instance method already restored",
  );
});

Deno.test("stub returns", () => {
  const point = new Point(2, 3);
  const func: Stub<Point> = stub(point, "action", [5, "x"]);
  const action: Stub<void> = func as unknown as Stub<void>;
  const expectedCalls: SpyCall[] = [];
  try {
    assertEquals(func.calls, expectedCalls);

    assertEquals(action(), 5);
    expectedCalls.push({ returned: 5, args: [] });
    assertEquals(func.calls, expectedCalls);
    assertEquals(point.action(), "x");
    expectedCalls.push({ self: point, returned: "x", args: [] });
    assertEquals(func.calls, expectedCalls);

    assertThrows(() => action(), SpyError, "no return for call");
    expectedCalls.push({ error: new SpyError("no return for call"), args: [] });
    assertEquals(func.calls, expectedCalls);

    assertNotEquals(func, Point.prototype.action);
    assertEquals(point.action, func);
  } finally {
    func.restore();
  }
  assertEquals(point.action, Point.prototype.action);
  assertThrows(
    () => func.restore(),
    SpyError,
    "instance method already restored",
  );
});

Deno.test("stub function", () => {
  const point = new Point(2, 3);
  // deno-lint-ignore no-explicit-any
  const returns: any[] = [1, "b", 2, "d"];
  const func: Stub<Point> = stub(point, "action", () => returns.shift());
  const action: Stub<void> = func as unknown as Stub<void>;
  const expectedCalls: SpyCall[] = [];
  try {
    assertEquals(func.calls, expectedCalls);

    assertEquals(action(), 1);
    expectedCalls.push({ returned: 1, args: [] });
    assertEquals(func.calls, expectedCalls);
    assertEquals(point.action(), "b");
    expectedCalls.push({ returned: "b", self: point, args: [] });
    assertEquals(func.calls, expectedCalls);

    func.returns = [null, 0];
    assertEquals(action(), null);
    expectedCalls.push({ returned: null, args: [] });
    assertEquals(func.calls, expectedCalls);
    assertEquals(point.action(), 0);
    expectedCalls.push({ returned: 0, self: point, args: [] });
    assertEquals(func.calls, expectedCalls);
    assertEquals(point.action(), 2);
    expectedCalls.push({ returned: 2, self: point, args: [] });
    assertEquals(func.calls, expectedCalls);

    func.returns = ["y", "z"];
    assertEquals(action("x"), "y");
    expectedCalls.push({ returned: "y", args: ["x"] });
    assertEquals(func.calls, expectedCalls);
    assertEquals(point.action("x"), "z");
    expectedCalls.push({ self: point, returned: "z", args: ["x"] });
    assertEquals(func.calls, expectedCalls);
    assertEquals(point.action("x"), "d");
    expectedCalls.push({ returned: "d", self: point, args: ["x"] });
    assertEquals(func.calls, expectedCalls);

    assertNotEquals(func, Point.prototype.action);
    assertEquals(point.action, func);
  } finally {
    func.restore();
  }
  assertEquals(point.action, Point.prototype.action);
  assertThrows(
    () => func.restore(),
    SpyError,
    "instance method already restored",
  );
});

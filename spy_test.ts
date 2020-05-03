import {
  assertEquals,
  assertNotEquals,
  assertThrows,
} from "./deps/std/testing/asserts.ts";
import { spy, Spy, SpyCall, SpyError } from "./spy.ts";
import { Point, stringifyPoint } from "./test_shared.ts";

Deno.test("spy default", () => {
  const func: Spy<void> = spy();
  const expectedCalls: SpyCall[] = [];
  assertEquals(func.calls, expectedCalls);

  assertEquals(func(), undefined);
  expectedCalls.push({ args: [] });
  assertEquals(func.calls, expectedCalls);

  assertEquals(func("x"), undefined);
  expectedCalls.push({ args: ["x"] });
  assertEquals(func.calls, expectedCalls);

  assertEquals(func({ x: 3 }), undefined);
  expectedCalls.push({ args: [{ x: 3 }] });
  assertEquals(func.calls, expectedCalls);

  assertEquals(func(3, 5, 7), undefined);
  expectedCalls.push({ args: [3, 5, 7] });
  assertEquals(func.calls, expectedCalls);

  const point: Point = new Point(2, 3);
  assertEquals(func(Point, stringifyPoint, point), undefined);
  expectedCalls.push({ args: [Point, stringifyPoint, { x: 2, y: 3 }] });
  assertEquals(func.calls, expectedCalls);

  assertThrows(
    () => func.restore(),
    SpyError,
    "no instance method to restore",
  );
});

Deno.test("spy function", () => {
  const func: Spy<void> = spy((value: any) => value);
  const expectedCalls: SpyCall[] = [];
  assertEquals(func.calls, expectedCalls);

  assertEquals(func(), undefined);
  expectedCalls.push({ args: [] });
  assertEquals(func.calls, expectedCalls);

  assertEquals(func("x"), "x");
  expectedCalls.push({ args: ["x"], returned: "x" });
  assertEquals(func.calls, expectedCalls);

  assertEquals(func({ x: 3 }), { x: 3 });
  expectedCalls.push({ args: [{ x: 3 }], returned: { x: 3 } });
  assertEquals(func.calls, expectedCalls);

  assertEquals(func(3, 5, 7), 3);
  expectedCalls.push({ args: [3, 5, 7], returned: 3 });
  assertEquals(func.calls, expectedCalls);

  const point: Point = new Point(2, 3);
  assertEquals(func(Point, stringifyPoint, point), Point);
  expectedCalls.push({
    args: [Point, stringifyPoint, { x: 2, y: 3 }],
    returned: Point,
  });
  assertEquals(func.calls, expectedCalls);

  assertThrows(
    () => func.restore(),
    SpyError,
    "no instance method to restore",
  );
});

Deno.test("spy instance method", () => {
  const point = new Point(2, 3);
  const func: Spy<Point> = spy(point, "action");
  const action: Spy<void> = func as unknown as Spy<void>;
  const expectedCalls: SpyCall[] = [];
  assertEquals(func.calls, expectedCalls);

  assertEquals(action(), undefined);
  expectedCalls.push({ args: [] });
  assertEquals(func.calls, expectedCalls);
  assertEquals(point.action(), undefined);
  expectedCalls.push({ self: point, args: [] });
  assertEquals(func.calls, expectedCalls);

  assertEquals(action("x"), "x");
  expectedCalls.push({ returned: "x", args: ["x"] });
  assertEquals(func.calls, expectedCalls);
  assertEquals(point.action("x"), "x");
  expectedCalls.push({ self: point, returned: "x", args: ["x"] });
  assertEquals(func.calls, expectedCalls);

  assertEquals(action({ x: 3 }), { x: 3 });
  expectedCalls.push({ returned: { x: 3 }, args: [{ x: 3 }] });
  assertEquals(func.calls, expectedCalls);
  assertEquals(point.action({ x: 3 }), { x: 3 });
  expectedCalls.push({ self: point, returned: { x: 3 }, args: [{ x: 3 }] });
  assertEquals(func.calls, expectedCalls);

  assertEquals(action(3, 5, 7), 3);
  expectedCalls.push({ returned: 3, args: [3, 5, 7] });
  assertEquals(func.calls, expectedCalls);
  assertEquals(point.action(3, 5, 7), 3);
  expectedCalls.push({ self: point, returned: 3, args: [3, 5, 7] });
  assertEquals(func.calls, expectedCalls);

  assertEquals(action(Point, stringifyPoint, point), Point);
  expectedCalls.push({
    returned: Point,
    args: [Point, stringifyPoint, point],
  });
  assertEquals(func.calls, expectedCalls);
  assertEquals(point.action(Point, stringifyPoint, point), Point);
  expectedCalls.push({
    self: point,
    returned: Point,
    args: [Point, stringifyPoint, point],
  });
  assertEquals(func.calls, expectedCalls);

  assertNotEquals(func, Point.prototype.action);
  assertEquals(point.action, func);
  func.restore();
  assertEquals(point.action, Point.prototype.action);
  assertThrows(
    () => func.restore(),
    SpyError,
    "instance method already restored",
  );
});

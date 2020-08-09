import {
  assertEquals,
  assertNotEquals,
  assertThrows,
  assertStrictEquals,
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
  try {
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

Deno.test("spy instance method symbol", () => {
  const point = new Point(2, 3);
  const func: Spy<Point> = spy(point, Symbol.iterator);
  const expectedCalls: SpyCall[] = [];
  try {
    assertEquals(func.calls, expectedCalls);

    const values: number[] = [];
    for (const value of point) {
      values.push(value);
    }
    expectedCalls.push({ self: point, args: [] });
    assertEquals(values, [2, 3]);
    assertEquals([...point], [2, 3]);
    expectedCalls.push({ self: point, args: [] });
    assertEquals(
      func.calls.map((call) => ({ self: call.self, args: call.args })),
      expectedCalls,
    );

    assertNotEquals(func, Point.prototype[Symbol.iterator]);
    assertEquals(point[Symbol.iterator], func);
  } finally {
    func.restore();
  }
  assertEquals(point[Symbol.iterator], Point.prototype[Symbol.iterator]);
  assertThrows(
    () => func.restore(),
    SpyError,
    "instance method already restored",
  );
});

Deno.test("spy instance method property descriptor", () => {
  const point = new Point(2, 3);
  const actionDescriptor: PropertyDescriptor = {
    configurable: true,
    enumerable: false,
    writable: false,
    value: function (...args: any[]) {
      return args[1];
    },
  };
  Object.defineProperty(point, "action", actionDescriptor);
  const action: Spy<Point> = spy(point, "action");
  const expectedCalls: SpyCall[] = [];
  try {
    assertEquals(action.calls, expectedCalls);

    assertEquals(action(), undefined);
    expectedCalls.push({ args: [] });
    assertEquals(action.calls, expectedCalls);
    assertEquals(point.action(), undefined);
    expectedCalls.push({ self: point, args: [] });
    assertEquals(action.calls, expectedCalls);

    assertEquals(action("x", "y"), "y");
    expectedCalls.push({ returned: "y", args: ["x", "y"] });
    assertEquals(action.calls, expectedCalls);
    assertEquals(point.action("x", "y"), "y");
    expectedCalls.push({ self: point, returned: "y", args: ["x", "y"] });
    assertEquals(action.calls, expectedCalls);

    assertNotEquals(action, actionDescriptor.value);
    assertEquals(point.action, action);
  } finally {
    action.restore();
  }
  assertEquals(point.action, actionDescriptor.value);
  assertEquals(
    Object.getOwnPropertyDescriptor(point, "action"),
    actionDescriptor,
  );
  assertThrows(
    () => action.restore(),
    SpyError,
    "instance method already restored",
  );
});

Deno.test("spy instance property getter/setter", () => {
  const point = new Point(2, 3);
  const action: Spy<Point> = spy(point, "action");
  const getter: Spy<Point> = action.get as Spy<Point>;
  const setter: Spy<Point> = action.set as Spy<Point>;

  const expectedCalls: SpyCall[] = [];
  const expectedGetterCalls: SpyCall[] = [];
  const expectedSetterCalls: SpyCall[] = [];
  try {
    assertEquals(action.calls, expectedCalls);
    assertEquals(getter.calls, expectedGetterCalls);
    assertEquals(setter.calls, expectedSetterCalls);

    assertStrictEquals(point.action, action);
    expectedGetterCalls.push({ self: point, args: [], returned: action });
    assertEquals(action.calls, expectedCalls);
    assertEquals(getter.calls, expectedGetterCalls);
    assertEquals(setter.calls, expectedSetterCalls);

    assertEquals(point.action(1, 2), 1);
    expectedCalls.push({ self: point, args: [1, 2], returned: 1 });
    expectedGetterCalls.push({ self: point, args: [], returned: action });
    assertEquals(action.calls, expectedCalls);
    assertEquals(getter.calls, expectedGetterCalls);
    assertEquals(setter.calls, expectedSetterCalls);

    const replacement: (...args: any[]) => any = (...args: any[]) => args[1];
    assertStrictEquals(point.action = replacement, replacement);
    expectedSetterCalls.push({ self: point, args: [replacement] });
    assertEquals(action.calls, expectedCalls);
    assertEquals(getter.calls, expectedGetterCalls);
    assertEquals(setter.calls, expectedSetterCalls);

    assertStrictEquals(point.action, replacement);
    expectedGetterCalls.push({ self: point, args: [], returned: replacement });
    assertEquals(action.calls, expectedCalls);
    assertEquals(getter.calls, expectedGetterCalls);
    assertEquals(setter.calls, expectedSetterCalls);

    assertEquals(point.action(1, 2), 2);
    expectedGetterCalls.push({ self: point, args: [], returned: replacement });
    assertEquals(action.calls, expectedCalls);
    assertEquals(getter.calls, expectedGetterCalls);
    assertEquals(setter.calls, expectedSetterCalls);
  } finally {
    action.restore();
  }
  assertStrictEquals(point.action, Point.prototype.action);
  assertEquals(getter.calls, expectedGetterCalls);
  assertThrows(
    () => action.restore(),
    SpyError,
    "instance method already restored",
  );
});

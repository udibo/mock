import { assertSpyCall, assertSpyCalls } from "./asserts.ts";
import {
  assertEquals,
  assertNotEquals,
  assertStrictEquals,
  assertThrows,
} from "./deps.ts";
import { Spy, spy, SpyError } from "./spy.ts";
import { Point, stringifyPoint } from "./test_shared.ts";

Deno.test("spy default", () => {
  const func: Spy<void> = spy();
  assertSpyCalls(func, 0);

  assertEquals(func(), undefined);
  assertSpyCall(func, 0, {
    self: undefined,
    args: [],
    returned: undefined,
  });
  assertSpyCalls(func, 1);

  assertEquals(func("x"), undefined);
  assertSpyCall(func, 1, {
    self: undefined,
    args: ["x"],
    returned: undefined,
  });
  assertSpyCalls(func, 2);

  assertEquals(func({ x: 3 }), undefined);
  assertSpyCall(func, 2, {
    self: undefined,
    args: [{ x: 3 }],
    returned: undefined,
  });
  assertSpyCalls(func, 3);

  assertEquals(func(3, 5, 7), undefined);
  assertSpyCall(func, 3, {
    self: undefined,
    args: [3, 5, 7],
    returned: undefined,
  });
  assertSpyCalls(func, 4);

  const point: Point = new Point(2, 3);
  assertEquals(func(Point, stringifyPoint, point), undefined);
  assertSpyCall(func, 4, {
    self: undefined,
    args: [Point, stringifyPoint, point],
    returned: undefined,
  });
  assertSpyCalls(func, 5);

  assertThrows(
    () => func.restore(),
    SpyError,
    "no instance property to restore",
  );
});

Deno.test("spy function", () => {
  const func: Spy<void> = spy((value) => value);
  assertSpyCalls(func, 0);

  assertEquals(func(), undefined);
  assertSpyCall(func, 0, {
    self: undefined,
    args: [],
    returned: undefined,
  });
  assertSpyCalls(func, 1);

  assertEquals(func("x"), "x");
  assertSpyCall(func, 1, {
    self: undefined,
    args: ["x"],
    returned: "x",
  });
  assertSpyCalls(func, 2);

  assertEquals(func({ x: 3 }), { x: 3 });
  assertSpyCall(func, 2, {
    self: undefined,
    args: [{ x: 3 }],
    returned: { x: 3 },
  });
  assertSpyCalls(func, 3);

  assertEquals(func(3, 5, 7), 3);
  assertSpyCall(func, 3, {
    self: undefined,
    args: [3, 5, 7],
    returned: 3,
  });
  assertSpyCalls(func, 4);

  const point: Point = new Point(2, 3);
  assertEquals(func(Point, stringifyPoint, point), Point);
  assertSpyCall(func, 4, {
    self: undefined,
    args: [Point, stringifyPoint, point],
    returned: Point,
  });
  assertSpyCalls(func, 5);

  assertThrows(
    () => func.restore(),
    SpyError,
    "no instance property to restore",
  );
});

Deno.test("spy instance property", () => {
  const point = new Point(2, 3);
  const func: Spy<Point> = spy(point, "action");
  assertSpyCalls(func, 0);

  assertEquals(func(), undefined);
  assertSpyCall(func, 0, {
    self: undefined,
    args: [],
    returned: undefined,
  });
  assertSpyCalls(func, 1);

  assertEquals(point.action(), undefined);
  assertSpyCall(func, 1, { self: point, args: [] });
  assertSpyCalls(func, 2);

  assertEquals(func("x"), "x");
  assertSpyCall(func, 2, {
    self: undefined,
    args: ["x"],
    returned: "x",
  });
  assertSpyCalls(func, 3);

  assertEquals(point.action("x"), "x");
  assertSpyCall(func, 3, {
    self: point,
    args: ["x"],
    returned: "x",
  });
  assertSpyCalls(func, 4);

  assertEquals(func({ x: 3 }), { x: 3 });
  assertSpyCall(func, 4, {
    self: undefined,
    args: [{ x: 3 }],
    returned: { x: 3 },
  });
  assertSpyCalls(func, 5);

  assertEquals(point.action({ x: 3 }), { x: 3 });
  assertSpyCall(func, 5, {
    self: point,
    args: [{ x: 3 }],
    returned: { x: 3 },
  });
  assertSpyCalls(func, 6);

  assertEquals(func(3, 5, 7), 3);
  assertSpyCall(func, 6, {
    self: undefined,
    args: [3, 5, 7],
    returned: 3,
  });
  assertSpyCalls(func, 7);

  assertEquals(point.action(3, 5, 7), 3);
  assertSpyCall(func, 7, {
    self: point,
    args: [3, 5, 7],
    returned: 3,
  });
  assertSpyCalls(func, 8);

  assertEquals(func(Point, stringifyPoint, point), Point);
  assertSpyCall(func, 8, {
    self: undefined,
    args: [Point, stringifyPoint, point],
    returned: Point,
  });
  assertSpyCalls(func, 9);

  assertEquals(point.action(Point, stringifyPoint, point), Point);
  assertSpyCall(func, 9, {
    self: point,
    args: [Point, stringifyPoint, point],
    returned: Point,
  });
  assertSpyCalls(func, 10);

  assertNotEquals(func, Point.prototype.action);
  assertEquals(point.action, func);

  func.restore();
  assertEquals(point.action, Point.prototype.action);
  assertThrows(
    () => func.restore(),
    SpyError,
    "instance property already restored",
  );
  assertThrows(
    () => func(),
    SpyError,
    "instance property already restored",
  );
});

Deno.test("spy instance method symbol", () => {
  const point = new Point(2, 3);
  const func: Spy<Point> = spy(point, Symbol.iterator);
  assertSpyCalls(func, 0);

  const values: number[] = [];
  for (const value of point) {
    values.push(value);
  }
  assertSpyCall(func, 0, {
    self: point,
    args: [],
  });
  assertSpyCalls(func, 1);

  assertEquals(values, [2, 3]);
  assertEquals([...point], [2, 3]);
  assertSpyCall(func, 1, {
    self: point,
    args: [],
  });
  assertSpyCalls(func, 2);

  assertNotEquals(func, Point.prototype[Symbol.iterator]);
  assertEquals(point[Symbol.iterator], func);

  func.restore();
  assertEquals(point[Symbol.iterator], Point.prototype[Symbol.iterator]);
  assertThrows(
    () => func.restore(),
    SpyError,
    "instance property already restored",
  );
});

Deno.test("spy instance method property descriptor", () => {
  const point = new Point(2, 3);
  const actionDescriptor: PropertyDescriptor = {
    configurable: true,
    enumerable: false,
    writable: false,
    // deno-lint-ignore no-explicit-any
    value: function (...args: any[]) {
      return args[1];
    },
  };
  Object.defineProperty(point, "action", actionDescriptor);
  const action: Spy<Point> = spy(point, "action");
  assertSpyCalls(action, 0);

  assertEquals(action(), undefined);
  assertSpyCall(action, 0, {
    self: undefined,
    args: [],
    returned: undefined,
  });
  assertSpyCalls(action, 1);

  assertEquals(point.action(), undefined);
  assertSpyCall(action, 1, {
    self: point,
    args: [],
    returned: undefined,
  });
  assertSpyCalls(action, 2);

  assertEquals(action("x", "y"), "y");
  assertSpyCall(action, 2, {
    self: undefined,
    args: ["x", "y"],
    returned: "y",
  });
  assertSpyCalls(action, 3);

  assertEquals(point.action("x", "y"), "y");
  assertSpyCall(action, 3, {
    self: point,
    args: ["x", "y"],
    returned: "y",
  });
  assertSpyCalls(action, 4);

  assertNotEquals(action, actionDescriptor.value);
  assertEquals(point.action, action);

  action.restore();
  assertEquals(point.action, actionDescriptor.value);
  assertEquals(
    Object.getOwnPropertyDescriptor(point, "action"),
    actionDescriptor,
  );
  assertThrows(
    () => action.restore(),
    SpyError,
    "instance property already restored",
  );
});

Deno.test("spy instance method property getter/setter", () => {
  const point = new Point(2, 3);
  const action: Spy<Point> = spy(point, "action");
  const getter: Spy<Point> = action.get!;
  const setter: Spy<Point> = action.set!;

  assertSpyCalls(action, 0);
  assertSpyCalls(getter, 0);
  assertSpyCalls(setter, 0);

  assertStrictEquals(point.action, action);
  assertSpyCall(getter, 0, {
    self: point,
    args: [],
    returned: action,
  });
  assertSpyCalls(action, 0);
  assertSpyCalls(getter, 1);
  assertSpyCalls(setter, 0);

  assertEquals(point.action(1, 2), 1);
  assertSpyCall(action, 0, { self: point, args: [1, 2], returned: 1 });
  assertSpyCall(getter, 1, { self: point, args: [], returned: action });
  assertSpyCalls(action, 1);
  assertSpyCalls(getter, 2);
  assertSpyCalls(setter, 0);

  const replacement = () => 3;
  assertStrictEquals(point.action = replacement, replacement);
  assertSpyCall(setter, 0, { self: point, args: [replacement] });
  assertSpyCalls(action, 1);
  assertSpyCalls(getter, 2);
  assertSpyCalls(setter, 1);

  assertStrictEquals(point.action, replacement);
  assertSpyCall(getter, 2, { self: point, args: [], returned: replacement });
  assertSpyCalls(action, 1);
  assertSpyCalls(getter, 3);
  assertSpyCalls(setter, 1);

  assertEquals(point.action(1, 2), 3);
  assertSpyCall(getter, 3, { self: point, args: [], returned: replacement });
  assertSpyCalls(action, 1);
  assertSpyCalls(getter, 4);
  assertSpyCalls(setter, 1);

  action.restore();
  assertStrictEquals(point.action, Point.prototype.action);
  assertSpyCalls(getter, 4);
  assertThrows(
    () => action.restore(),
    SpyError,
    "instance property already restored",
  );
});

Deno.test("spy instance property getter/setter", () => {
  const point = new Point(2, 3);
  const x: Spy<Point> = spy(point, "x");
  const getter: Spy<Point> = x.get as Spy<Point>;
  const setter: Spy<Point> = x.set as Spy<Point>;

  assertSpyCalls(x, 0);
  assertSpyCalls(getter, 0);
  assertSpyCalls(setter, 0);

  assertStrictEquals(point.x, 2);
  assertSpyCall(getter, 0, { self: point, args: [], returned: 2 });
  assertSpyCalls(x, 0);
  assertSpyCalls(getter, 1);
  assertSpyCalls(setter, 0);

  assertThrows(() => x(1, 2), SpyError, "not a function");
  assertSpyCall(getter, 1, { self: undefined, args: [], returned: 2 });
  assertSpyCall(x, 0, {
    self: undefined,
    args: [1, 2],
    error: { Class: SpyError, msg: "not a function" },
  });
  assertSpyCalls(x, 1);
  assertSpyCalls(getter, 2);
  assertSpyCalls(setter, 0);

  assertStrictEquals(point.x = 4, 4);
  assertSpyCall(setter, 0, { self: point, args: [4], returned: undefined });
  assertSpyCalls(x, 1);
  assertSpyCalls(getter, 2);
  assertSpyCalls(setter, 1);

  assertStrictEquals(point.x, 4);
  assertSpyCall(getter, 2, { self: point, args: [], returned: 4 });
  assertSpyCalls(x, 1);
  assertSpyCalls(getter, 3);
  assertSpyCalls(setter, 1);

  x.restore();
  assertStrictEquals(point.x, 2);
  assertSpyCalls(getter, 3);
  assertThrows(
    () => x.restore(),
    SpyError,
    "instance property already restored",
  );
});

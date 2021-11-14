import { assertSpyCall, assertSpyCalls } from "./asserts.ts";
import { assertEquals, assertThrows } from "./deps.ts";
import { SpyError, Stub, stub } from "./stub.ts";
import { Point } from "./test_shared.ts";

Deno.test("stub default", () => {
  const point = new Point(2, 3);
  const func: Stub<Point> = stub(point, "action");

  try {
    assertSpyCalls(func, 0);

    assertEquals(func(), undefined);
    assertSpyCall(func, 0, {
      self: undefined,
      args: [],
      returned: undefined,
    });
    assertSpyCalls(func, 1);

    assertEquals(point.action(), undefined);
    assertSpyCall(func, 1, {
      self: point,
      args: [],
      returned: undefined,
    });
    assertSpyCalls(func, 2);

    assertEquals(func.original, Point.prototype.action);
    assertEquals(point.action, func);
  } finally {
    func.restore();
  }
  assertEquals(point.action, Point.prototype.action);
  assertThrows(
    () => func.restore(),
    SpyError,
    "instance property already restored",
  );
});

Deno.test("stub non function property", () => {
  const point = new Point(2, 3);
  assertEquals(point.x, 2);
  const prop: Stub<Point> = stub(point, "x", 4);

  try {
    assertSpyCalls(prop, 0);

    assertThrows(() => prop(), SpyError, "not a function");
    assertEquals(point.x, 4);
  } finally {
    prop.restore();
  }
  assertEquals(point.x, 2);
  assertThrows(
    () => prop.restore(),
    SpyError,
    "instance property already restored",
  );
});

Deno.test("stub function", () => {
  const point = new Point(2, 3);
  const returns = [1, "b", 2, "d"];
  const func: Stub<Point> = stub(point, "action", () => returns.shift());

  assertSpyCalls(func, 0);

  assertEquals(func(), 1);
  assertSpyCall(func, 0, {
    self: undefined,
    args: [],
    returned: 1,
  });
  assertSpyCalls(func, 1);

  assertEquals(point.action(), "b");
  assertSpyCall(func, 1, {
    self: point,
    args: [],
    returned: "b",
  });
  assertSpyCalls(func, 2);

  assertEquals(func.original, Point.prototype.action);
  assertEquals(point.action, func);

  func.restore();
  assertEquals(point.action, Point.prototype.action);
  assertThrows(
    () => func.restore(),
    SpyError,
    "instance property already restored",
  );
});

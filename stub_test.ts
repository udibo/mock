import { assertSpyCall, assertSpyCalls } from "./asserts.ts";
import { assertEquals, assertNotEquals, assertThrows } from "./deps.ts";
import { SpyError, Stub, stub } from "./stub.ts";
import { Point } from "./test_shared.ts";

Deno.test("stub default", () => {
  const point = new Point(2, 3);
  const func: Stub<Point> = stub(point, "action");

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

  func.returns = [null, 0];
  assertEquals(func(), null);
  assertSpyCall(func, 2, {
    self: undefined,
    args: [],
    returned: null,
  });
  assertSpyCalls(func, 3);

  assertEquals(point.action(), 0);
  assertSpyCall(func, 3, {
    self: point,
    args: [],
    returned: 0,
  });
  assertSpyCalls(func, 4);

  assertEquals(point.action(), undefined);
  assertSpyCall(func, 4, {
    self: point,
    args: [],
    returned: undefined,
  });
  assertSpyCalls(func, 5);

  func.returns = ["y", "z"];
  assertEquals(func("x"), "y");
  assertSpyCall(func, 5, {
    self: undefined,
    args: ["x"],
    returned: "y",
  });
  assertSpyCalls(func, 6);

  assertEquals(point.action("x"), "z");
  assertSpyCall(func, 6, {
    self: point,
    args: ["x"],
    returned: "z",
  });
  assertSpyCalls(func, 7);

  assertEquals(point.action("x"), undefined);
  assertSpyCall(func, 7, {
    self: point,
    args: ["x"],
    returned: undefined,
  });
  assertSpyCalls(func, 8);

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

Deno.test("stub returns", () => {
  const point = new Point(2, 3);
  const func: Stub<Point> = stub(point, "action", [5, "x"]);

  assertSpyCalls(func, 0);

  assertEquals(func(), 5);
  assertSpyCall(func, 0, {
    self: undefined,
    args: [],
    returned: 5,
  });
  assertSpyCalls(func, 1);

  assertEquals(point.action(), "x");
  assertSpyCall(func, 1, {
    self: point,
    args: [],
    returned: "x",
  });
  assertSpyCalls(func, 2);

  assertThrows(() => func(), SpyError, "no return for call");
  assertSpyCall(func, 2, {
    self: undefined,
    args: [],
    error: { Class: SpyError, msg: "no return for call" },
  });
  assertSpyCalls(func, 3);

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

  func.returns = [null, 0];
  assertEquals(func(), null);
  assertSpyCall(func, 2, {
    self: undefined,
    args: [],
    returned: null,
  });
  assertSpyCalls(func, 3);

  assertEquals(point.action(), 0);
  assertSpyCall(func, 3, {
    self: point,
    args: [],
    returned: 0,
  });
  assertSpyCalls(func, 4);

  assertEquals(point.action(), 2);
  assertSpyCall(func, 4, {
    self: point,
    args: [],
    returned: 2,
  });
  assertSpyCalls(func, 5);

  func.returns = ["y", "z"];
  assertEquals(func("x"), "y");
  assertSpyCall(func, 5, {
    self: undefined,
    args: ["x"],
    returned: "y",
  });
  assertSpyCalls(func, 6);

  assertEquals(point.action("x"), "z");
  assertSpyCall(func, 6, {
    self: point,
    args: ["x"],
    returned: "z",
  });
  assertSpyCalls(func, 7);

  assertEquals(point.action("y"), "d");
  assertSpyCall(func, 7, {
    self: point,
    args: ["y"],
    returned: "d",
  });
  assertSpyCalls(func, 8);

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

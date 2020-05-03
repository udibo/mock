import {
  assertEquals,
  assertNotEquals,
  assertThrows,
  assertThrowsAsync,
} from "./deps/std/testing/asserts.ts";
import {
  Stub,
  stub,
  SpyCall,
  SpyError,
  returnsThis,
  returnsArg,
  throws,
  resolves,
  rejects,
  returnsArgs,
} from "./stub.ts";
import { Point } from "./test_shared.ts";

Deno.test("stub default", () => {
  const point = new Point(2, 3);
  const func: Stub<Point> = stub(point, "action");
  const action: Stub<void> = func as unknown as Stub<void>;
  const expectedCalls: SpyCall[] = [];
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
  const action: Stub<void> = func as unknown as Stub<void>;
  const expectedCalls: SpyCall[] = [];
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
  let returns: any[] = [1, "b", 2, "d"];
  const func: Stub<Point> = stub(point, "action", () => returns.shift());
  const action: Stub<void> = func as unknown as Stub<void>;
  const expectedCalls: SpyCall[] = [];
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
  func.restore();
  assertEquals(point.action, Point.prototype.action);
  assertThrows(
    () => func.restore(),
    SpyError,
    "instance method already restored",
  );
});

Deno.test("returnsThis", () => {
  const callback = returnsThis();
  const obj = { callback, x: 1, y: 2 };
  const obj2 = { x: 2, y: 3 };
  assertEquals(callback(), undefined);
  assertEquals(obj.callback(), obj);
  assertEquals(callback.apply(obj2, []), obj2);
});

Deno.test("returnsArg", () => {
  let callback = returnsArg(0);
  assertEquals(callback(), undefined);
  assertEquals(callback("a"), "a");
  assertEquals(callback("b", "c"), "b");
  callback = returnsArg(1);
  assertEquals(callback(), undefined);
  assertEquals(callback("a"), undefined);
  assertEquals(callback("b", "c"), "c");
  assertEquals(callback("d", "e", "f"), "e");
});

Deno.test("returnsArgs", () => {
  let callback = returnsArgs();
  assertEquals(callback(), []);
  assertEquals(callback("a"), ["a"]);
  assertEquals(callback("b", "c"), ["b", "c"]);
  callback = returnsArgs(1);
  assertEquals(callback(), []);
  assertEquals(callback("a"), []);
  assertEquals(callback("b", "c"), ["c"]);
  assertEquals(callback("d", "e", "f"), ["e", "f"]);
  callback = returnsArgs(1, 3);
  assertEquals(callback("a"), []);
  assertEquals(callback("b", "c"), ["c"]);
  assertEquals(callback("d", "e", "f"), ["e", "f"]);
  assertEquals(callback("d", "e", "f", "g"), ["e", "f"]);
});

Deno.test("throws", () => {
  let callback = throws(new Error("not found"));
  assertThrows(
    () => callback(),
    Error,
    "not found",
  );
  callback = throws(new Error("invalid"));
  assertThrows(
    () => callback(),
    Error,
    "invalid",
  );
});

Deno.test("resolves", async () => {
  let callback = resolves(2);
  assertEquals(await callback(), 2);
  callback = resolves(3);
  assertEquals(await callback(), 3);
});

Deno.test("rejects", async () => {
  let callback = rejects(new Error("not found"));
  await assertThrowsAsync(
    callback,
    Error,
    "not found",
  );
  callback = rejects(new Error("invalid"));
  await assertThrowsAsync(
    callback,
    Error,
    "invalid",
  );
});

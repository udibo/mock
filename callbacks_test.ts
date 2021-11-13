import { assertEquals } from "./deps.ts";
import { returnsArg, returnsArgs, returnsThis } from "./callbacks.ts";

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

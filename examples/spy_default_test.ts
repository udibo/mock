import { assertEquals } from "../deps.ts";
import { assertSpyCall, spy } from "../mod.ts";

function add(
  a: number,
  b: number,
  callback: (error: Error | void, value?: number) => void,
): void {
  const value: number = a + b;
  if (typeof value === "number" && !isNaN(value)) callback(undefined, value);
  else callback(new Error("invalid input"));
}

Deno.test("add calls fake callback", () => {
  const callback = spy();

  assertEquals(add(2, 3, callback), undefined);
  assertSpyCall(callback, 0, { args: [undefined, 5] });
  assertEquals(add(5, 4, callback), undefined);
  assertSpyCall(callback, 1, { args: [undefined, 9] });
});

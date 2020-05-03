import { assertEquals } from "../deps/std/testing/asserts.ts";
import { spy, Spy } from "../spy.ts";

function add(
  a: number,
  b: number,
  callback: (error: Error | void, value?: number) => void,
): void {
  const value: number = a + b;
  if (typeof value === "number" && value !== NaN) callback(undefined, value);
  else callback(new Error("invalid input"));
}

Deno.test("calls fake callback", () => {
  const callback: Spy<void> = spy();

  assertEquals(add(2, 3, callback), undefined);
  assertEquals(add(5, 4, callback), undefined);
  assertEquals(callback.calls, [
    { args: [undefined, 5] },
    { args: [undefined, 9] },
  ]);
});

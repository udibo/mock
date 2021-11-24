import { assertEquals } from "../deps.ts";
import { assertSpyCall, assertSpyCalls, Spy, spy } from "../mod.ts";

function filter<T>(values: T[], callback: (value: T) => boolean): T[] {
  return values.filter(callback);
}

function isEven(value: number): boolean {
  return value % 2 === 0;
}

Deno.test("calls real callback", () => {
  const callback: Spy<void> = spy(isEven);
  const values: number[] = [5, 6, 7, 8];

  assertEquals(filter(values, callback), [6, 8]);
  assertSpyCall(callback, 0, { args: [5, 0, values], returned: false });
  assertSpyCall(callback, 1, { args: [6, 1, values], returned: true });
  assertSpyCall(callback, 2, { args: [7, 2, values], returned: false });
  assertSpyCall(callback, 3, { args: [8, 3, values], returned: true });
  assertSpyCalls(callback, 4);
});

import { assertEquals } from "../deps/std/testing/asserts.ts";
import { spy, Spy } from "../spy.ts";

function filter<T>(values: T[], callback: (value: T) => boolean): any[] {
  return values.filter(callback);
}

function isEven(value: number): boolean {
  return value % 2 === 0;
}

Deno.test("calls real callback", () => {
  const callback: Spy<void> = spy(isEven);
  const values: number[] = [5, 6, 7, 8];

  assertEquals(filter(values, callback), [6, 8]);
  assertEquals(callback.calls, [
    { args: [5, 0, values], returned: false },
    { args: [6, 1, values], returned: true },
    { args: [7, 2, values], returned: false },
    { args: [8, 3, values], returned: true },
  ]);
});

import { assertEquals } from "./deps.ts";
import { Point, stringifyPoint } from "./test_shared.ts";

Deno.test("test_shared Point", () => {
  const point: Point = new Point(2, 3);
  assertEquals(point.action(), undefined);
  assertEquals(point.action(5), 5);
  assertEquals(point.action(5, 3), 5);
  assertEquals(point.toString(), "2, 3");
  assertEquals([...point], [2, 3]);
});

Deno.test("test_shared stringifyPoint", () => {
  const point: Point = new Point(2, 3);
  assertEquals(stringifyPoint(point), "2, 3");
});

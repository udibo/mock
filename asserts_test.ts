import {
  assertThrows,
  AssertionError,
} from "./deps/std/testing/asserts.ts";
import { assertPassthrough } from "./asserts.ts";
import { Point } from "./test_shared.ts";

Deno.test("assertPassthrough function", () => {
  const point: Point = new Point(2, 3);
  const point2: Point = new Point(3, 4);
  const callToString: (point: Point) => string = (point: Point) => {
    return point.toString();
  };

  assertPassthrough({
    func: callToString,
    args: [point],
    returned: "6, 7",
    target: {
      instance: point,
      method: "toString",
      self: point,
      args: [],
      returned: "6, 7",
    },
  });
  assertThrows(
    () =>
      assertPassthrough({
        func: callToString,
        args: [point],
        returned: "2, 3",
        target: {
          instance: point,
          method: "toString",
          args: [point],
          returned: "6, 7",
        },
      }),
    AssertionError,
    "passthrough did not return expected value",
  );
  assertThrows(
    () =>
      assertPassthrough({
        func: callToString,
        args: [point],
        returned: "6, 7",
        target: {
          instance: point,
          method: "toString",
          self: point2,
          args: [],
          returned: "6, 7",
        },
      }),
    AssertionError,
    "target not called on expected self",
  );
  assertThrows(
    () =>
      assertPassthrough({
        func: callToString,
        args: [point],
        returned: "6, 7",
        target: {
          instance: point,
          method: "toString",
          args: [5, 6],
          returned: "6, 7",
        },
      }),
    AssertionError,
    "target not called with expected args",
  );
  assertThrows(
    () =>
      assertPassthrough({
        func: callToString,
        args: [5, 8],
        returned: "6, 7",
        target: {
          instance: point,
          method: "toString",
          args: [point],
          returned: "6, 7",
        },
      }),
    AssertionError,
    "passthrough did not return expected value",
  );
});

Deno.test("assertPassthrough instance", () => {
  const point: Point = new Point(2, 3);
  const point2: Point = new Point(3, 4);
  const callAction: (a: number, b: number) => number = (
    a: number,
    b: number,
  ) => {
    return 3 * point.action.call(point2, a * 2, b * 2);
  };
  const fakePoint: Partial<Point> = { action: callAction };

  assertPassthrough({
    instance: fakePoint,
    method: "action",
    args: [5, 8],
    returned: 9,
    target: {
      instance: point,
      self: point2,
      args: [10, 16],
      returned: 3,
    },
  });
  assertThrows(
    () =>
      assertPassthrough({
        instance: fakePoint,
        method: "action",
        args: [5, 8],
        returned: 15,
        target: {
          instance: point,
          self: point2,
          args: [10, 16],
          returned: 3,
        },
      }),
    AssertionError,
    "passthrough did not return expected value",
  );
  assertThrows(
    () =>
      assertPassthrough({
        instance: fakePoint,
        method: "action",
        args: [5, 8],
        returned: 9,
        target: {
          instance: point,
          self: point,
          args: [10, 16],
          returned: 3,
        },
      }),
    AssertionError,
    "target not called on expected self",
  );
  assertThrows(
    () =>
      assertPassthrough({
        instance: fakePoint,
        method: "action",
        args: [5, 8],
        returned: 9,
        target: {
          instance: point,
          self: point2,
          args: [19, 16],
          returned: 3,
        },
      }),
    AssertionError,
    "target not called with expected args",
  );
  assertThrows(
    () =>
      assertPassthrough({
        instance: fakePoint,
        method: "action",
        target: {
          instance: point,
          self: point2,
        },
      }),
    AssertionError,
    "passthrough did not return expected value",
  );
});

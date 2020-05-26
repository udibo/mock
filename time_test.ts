import {
  assertEquals,
  assertNotEquals,
  assertStrictEq,
} from "./deps/std/testing/asserts.ts";
import {
  NativeTime,
  FakeDate,
  FakeTime,
} from "./time.ts";
import { spy, Spy, SpyCall } from "./spy.ts";
import { assertPassthrough } from "./asserts.ts";
import { fromNow } from "./callbacks.ts";

Deno.test("FakeDate parse and UTC behave the same", () => {
  assertEquals(
    FakeDate.UTC(96, 1, 2, 3, 4, 5),
    NativeTime.Date.UTC(96, 1, 2, 3, 4, 5),
  );
  assertEquals(
    FakeDate.parse("04 Dec 1995 00:12:00 GMT"),
    NativeTime.Date.parse("04 Dec 1995 00:12:00 GMT"),
  );
});

Deno.test("Date unchanged if FakeTime is uninitialized", () => {
  FakeTime.restore();
  assertNotEquals(Date, FakeDate);
  assertStrictEq(Date, NativeTime.Date);
});

Deno.test("Date is FakeDate if FakeTime is initialized", () => {
  const time: FakeTime = new FakeTime(9001);
  try {
    assertNotEquals(Date, NativeTime.Date);
    assertStrictEq(Date, FakeDate);
  } finally {
    time.restore();
  }
  assertNotEquals(Date, FakeDate);
  assertStrictEq(Date, NativeTime.Date);
});

Deno.test("FakeDate.now uses Date.now if FakeTime is uninitialized", () => {
  FakeTime.restore();
  const now: Spy<DateConstructor> = spy(NativeTime.Date, "now");
  try {
    const result = FakeDate.now();
    assertEquals(now.calls.length, 1);
    assertEquals(now.calls[0].self, NativeTime.Date);
    assertEquals(now.calls[0].args, []);
    assertEquals(result, now.calls[0].returned);
  } finally {
    now.restore();
  }
});

Deno.test("FakeDate.now returns current fake time if FakeTime initialized", () => {
  const now: Spy<DateConstructor> = spy(NativeTime.Date, "now");
  const time: FakeTime = new FakeTime(9001);
  try {
    assertEquals(FakeDate.now(), 9001);
    assertEquals(now.calls.length, 0);
    time.tick(1523);
    assertEquals(FakeDate.now(), 10524);
    assertEquals(now.calls.length, 0);
  } finally {
    now.restore();
    time.restore();
  }
});

Deno.test("FakeDate instance methods passthrough to Date instance methods", () => {
  const now: FakeDate = new FakeDate("2020-05-25T05:00:00.12345Z");
  assertEquals(now.toISOString(), "2020-05-25T05:00:00.123Z");
  Object.getOwnPropertyNames(Date.prototype).forEach((name: string) => {
    const propName: keyof Date = name as keyof Date;
    assertPassthrough({
      instance: now,
      method: propName,
      target: {
        instance: now.date,
        self: now.date,
      },
    });
  });
  assertPassthrough({
    instance: now,
    method: Symbol.toPrimitive,
    target: {
      instance: now.date,
      self: now.date,
    },
  });
});

Deno.test("timeout functions unchanged if FakeTime is uninitialized", () => {
  FakeTime.restore();
  assertNotEquals(setTimeout, FakeTime.setTimeout);
  assertStrictEq(setTimeout, NativeTime.setTimeout);
  assertNotEquals(clearTimeout, FakeTime.clearTimeout);
  assertStrictEq(clearTimeout, NativeTime.clearTimeout);
});

Deno.test("timeout functions are fake if FakeTime is initialized", () => {
  const time: FakeTime = new FakeTime();
  try {
    assertNotEquals(setTimeout, NativeTime.setTimeout);
    assertStrictEq(setTimeout, FakeTime.setTimeout);
    assertNotEquals(clearTimeout, NativeTime.clearTimeout);
    assertStrictEq(clearTimeout, FakeTime.clearTimeout);
  } finally {
    time.restore();
  }
  assertNotEquals(setTimeout, FakeTime.setTimeout);
  assertStrictEq(setTimeout, NativeTime.setTimeout);
  assertNotEquals(clearTimeout, FakeTime.clearTimeout);
  assertStrictEq(clearTimeout, NativeTime.clearTimeout);
});

Deno.test("FakeTime controls timeouts", () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb: Spy<void> = spy(fromNow());
  const expected: SpyCall[] = [];

  try {
    setTimeout(cb, 1000);
    time.tick(250);
    assertEquals(cb.calls, expected);
    time.tick(250);
    assertEquals(cb.calls, expected);
    time.tick(500);
    expected.push({ args: [], returned: 1000 });
    assertEquals(cb.calls, expected);
    time.tick(2500);
    assertEquals(cb.calls, expected);

    setTimeout(cb, 1000, "a");
    setTimeout(cb, 2000, "b");
    setTimeout(cb, 1500, "c");
    assertEquals(cb.calls, expected);
    time.tick(2500);
    expected.push({ args: ["a"], returned: 4500 });
    expected.push({ args: ["c"], returned: 5000 });
    expected.push({ args: ["b"], returned: 5500 });
    assertEquals(cb.calls, expected);

    setTimeout(cb, 1000, "a");
    setTimeout(cb, 1500, "b");
    const timeout: number = setTimeout(cb, 1750, "c");
    setTimeout(cb, 2000, "d");
    time.tick(1250);
    expected.push({ args: ["a"], returned: 7000 });
    assertEquals(cb.calls, expected);
    assertEquals(Date.now(), start + 7250);
    clearTimeout(timeout);
    time.tick(500);
    expected.push({ args: ["b"], returned: 7500 });
    assertEquals(cb.calls, expected);
    assertEquals(Date.now(), start + 7750);
    time.tick(250);
    expected.push({ args: ["d"], returned: 8000 });
    assertEquals(cb.calls, expected);
  } finally {
    time.restore();
  }
});

Deno.test("interval functions unchanged if FakeTime is uninitialized", () => {
  FakeTime.restore();
  assertNotEquals(setInterval, FakeTime.setInterval);
  assertStrictEq(setInterval, NativeTime.setInterval);
  assertNotEquals(clearInterval, FakeTime.clearInterval);
  assertStrictEq(clearInterval, NativeTime.clearInterval);
});

Deno.test("interval functions are fake if FakeTime is initialized", () => {
  const time: FakeTime = new FakeTime();
  try {
    assertNotEquals(setInterval, NativeTime.setInterval);
    assertStrictEq(setInterval, FakeTime.setInterval);
    assertNotEquals(clearInterval, NativeTime.clearInterval);
    assertStrictEq(clearInterval, FakeTime.clearInterval);
  } finally {
    time.restore();
  }
  assertNotEquals(setInterval, FakeTime.setInterval);
  assertStrictEq(setInterval, NativeTime.setInterval);
  assertNotEquals(clearInterval, FakeTime.clearInterval);
  assertStrictEq(clearInterval, NativeTime.clearInterval);
});

Deno.test("FakeTime controls intervals", () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb: Spy<void> = spy(fromNow());
  const expected: SpyCall[] = [];
  try {
    const interval: number = setInterval(cb, 1000);
    time.tick(250);
    assertEquals(cb.calls, expected);
    time.tick(250);
    assertEquals(cb.calls, expected);
    time.tick(500);
    expected.push({ args: [], returned: 1000 });
    assertEquals(cb.calls, expected);
    time.tick(2500);
    expected.push({ args: [], returned: 2000 });
    expected.push({ args: [], returned: 3000 });
    assertEquals(cb.calls, expected);
  } finally {
    time.restore();
  }
});

Deno.test("FakeTime calls timeout and interval callbacks in correct order", () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb: Spy<void> = spy(fromNow());
  const timeoutCb: Spy<void> = spy(cb);
  const intervalCb: Spy<void> = spy(cb);
  const expected: SpyCall[] = [];
  const timeoutExpected: SpyCall[] = [];
  const intervalExpected: SpyCall[] = [];
  try {
    const interval: number = setInterval(intervalCb, 1000);
    setTimeout(timeoutCb, 500);
    time.tick(250);
    assertEquals(intervalCb.calls, intervalExpected);
    time.tick(250);
    setTimeout(timeoutCb, 1000);
    let expect: SpyCall = { args: [], returned: 500 };
    expected.push(expect);
    timeoutExpected.push(expect);
    assertEquals(cb.calls, expected);
    assertEquals(timeoutCb.calls, timeoutExpected);
    assertEquals(cb.calls, expected);
    assertEquals(intervalCb.calls, intervalExpected);
    time.tick(500);
    expect = { args: [], returned: 1000 };
    expected.push(expect);
    intervalExpected.push(expect);
    assertEquals(cb.calls, expected);
    assertEquals(intervalCb.calls, intervalExpected);
    time.tick(2500);
    expect = { args: [], returned: 1500 };
    expected.push(expect);
    timeoutExpected.push(expect);
    expect = { args: [], returned: 2000 };
    expected.push(expect);
    intervalExpected.push(expect);
    expect = { args: [], returned: 3000 };
    expected.push(expect);
    intervalExpected.push(expect);
    assertEquals(cb.calls, expected);
    assertEquals(timeoutCb.calls, timeoutExpected);
    assertEquals(intervalCb.calls, intervalExpected);
  } finally {
    time.restore();
  }
});

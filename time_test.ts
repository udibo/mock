import {
  assert,
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertStrictEquals,
} from "./deps.ts";
import { FakeDate, FakeTime, NativeDate } from "./time.ts";
import { MockError, spy, SpyCall, stub } from "./mock.ts";
import { assertSpyCall, assertSpyCalls } from "./asserts.ts";

function fromNow(): () => number {
  const start: number = Date.now();
  return () => Date.now() - start;
}

Deno.test("FakeDate parse and UTC behave the same", () => {
  assertEquals(
    FakeDate.UTC(96, 1, 2, 3, 4, 5),
    NativeDate.UTC(96, 1, 2, 3, 4, 5),
  );
  assertEquals(
    FakeDate.parse("04 Dec 1995 00:12:00 GMT"),
    NativeDate.parse("04 Dec 1995 00:12:00 GMT"),
  );
});

Deno.test("Date unchanged if FakeTime is uninitialized", () => {
  FakeTime.restore();
  assertNotEquals(Date, FakeDate);
  assertStrictEquals(Date, NativeDate);
});

Deno.test("Date is FakeDate if FakeTime is initialized", () => {
  const time: FakeTime = new FakeTime(9001);
  try {
    assertNotEquals(Date, NativeDate);
    assertStrictEquals(Date, FakeDate);
  } finally {
    time.restore();
  }
  assertNotEquals(Date, FakeDate);
  assertStrictEquals(Date, NativeDate);
});

Deno.test("FakeDate.now uses Date.now if FakeTime is uninitialized", () => {
  FakeTime.restore();
  const now = spy(NativeDate, "now");
  try {
    const result = FakeDate.now();
    assertEquals(now.calls.length, 1);
    assertEquals(now.calls[0].self, NativeDate);
    assertEquals(now.calls[0].args, []);
    assertEquals(result, now.calls[0].returned);
  } finally {
    now.restore();
  }
});

Deno.test("FakeDate.now returns current fake time if FakeTime initialized", () => {
  const time: FakeTime = new FakeTime(9001);
  const now = spy(NativeDate, "now");
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
  Object.getOwnPropertyNames(Date.prototype).forEach((method: string) => {
    if (typeof Date.prototype[method as keyof Date] === "function") {
      if (typeof now[method as keyof Date] !== "function") {
        throw new MockError(`FakeDate missing ${method} method`);
      }
      const returned = Symbol();
      const func = stub(now.date, method as keyof Date, () => returned);
      const args = Array(5).fill(undefined).map(() => Symbol());
      (now[method as keyof Date] as CallableFunction)(...args);
      assertSpyCall(func, 0, {
        self: now.date,
        args,
        returned,
      });
      assertSpyCalls(func, 1);
    }
  });
  Object.getOwnPropertySymbols(Date.prototype).forEach((method: symbol) => {
    if (typeof Date.prototype[method as keyof Date] === "function") {
      if (typeof now[method as keyof Date] !== "function") {
        throw new MockError(`FakeDate missing ${method.toString()} method`);
      }
      const returned = Symbol();
      const func = stub(now.date, method as keyof Date, () => returned);
      const args = Array(5).fill(undefined).map(() => Symbol());
      (now[method as keyof Date] as CallableFunction)(...args);
      assertSpyCall(func, 0, {
        self: now.date,
        args,
        returned,
      });
      assertSpyCalls(func, 1);
    }
  });
});

Deno.test("timeout functions unchanged if FakeTime is uninitialized", () => {
  FakeTime.restore();
  assertNotEquals(setTimeout, FakeTime.setTimeout);
  assertNotEquals(clearTimeout, FakeTime.clearTimeout);
});

Deno.test("timeout functions are fake if FakeTime is initialized", () => {
  const time: FakeTime = new FakeTime();
  try {
    assertStrictEquals(setTimeout, FakeTime.setTimeout);
    assertStrictEquals(clearTimeout, FakeTime.clearTimeout);
  } finally {
    time.restore();
  }
  assertNotEquals(setTimeout, FakeTime.setTimeout);
  assertNotEquals(clearTimeout, FakeTime.clearTimeout);
});

Deno.test("FakeTime only ticks forward when setting now or calling tick", () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();

  try {
    assertEquals(Date.now(), start);
    time.tick(5);
    assertEquals(Date.now(), start + 5);
    time.now = start + 1000;
    assertEquals(Date.now(), start + 1000);
    assert(NativeDate.now() < start + 1000);
  } finally {
    time.restore();
  }
});

Deno.test("FakeTime controls timeouts", () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
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
  assertNotEquals(clearInterval, FakeTime.clearInterval);
});

Deno.test("interval functions are fake if FakeTime is initialized", () => {
  const time: FakeTime = new FakeTime();
  try {
    assertStrictEquals(setInterval, FakeTime.setInterval);
    assertStrictEquals(clearInterval, FakeTime.clearInterval);
  } finally {
    time.restore();
  }
  assertNotEquals(setInterval, FakeTime.setInterval);
  assertNotEquals(clearInterval, FakeTime.clearInterval);
});

Deno.test("FakeTime controls intervals", () => {
  const time: FakeTime = new FakeTime();
  const cb = spy(fromNow());
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

    clearInterval(interval);
    time.tick(1000);
    assertEquals(cb.calls, expected);
  } finally {
    time.restore();
  }
});

Deno.test("FakeTime calls timeout and interval callbacks in correct order", () => {
  const time: FakeTime = new FakeTime();
  const cb = spy(fromNow());
  const timeoutCb = spy(cb);
  const intervalCb = spy(cb);
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

    clearInterval(interval);
    time.tick(1000);
    assertEquals(cb.calls, expected);
    assertEquals(timeoutCb.calls, timeoutExpected);
    assertEquals(intervalCb.calls, intervalExpected);
  } finally {
    time.restore();
  }
});

Deno.test("FakeTime restoreFor restores real time temporarily", async () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();

  try {
    assertEquals(Date.now(), start);
    time.tick(1000);
    assertEquals(Date.now(), start + 1000);
    assert(NativeDate.now() < start + 1000);
    await FakeTime.restoreFor(() => {
      assert(Date.now() < start + 1000);
    });
    assertEquals(Date.now(), start + 1000);
    assert(NativeDate.now() < start + 1000);
  } finally {
    time.restore();
  }
});

Deno.test("delay uses real time", async () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();

  try {
    assertEquals(Date.now(), start);
    await time.delay(20);
    assert(NativeDate.now() >= start + 20);
    assertEquals(Date.now(), start);
  } finally {
    time.restore();
  }
});

Deno.test("delay runs all microtasks before resolving", async () => {
  const time: FakeTime = new FakeTime();

  try {
    const seq = [];
    queueMicrotask(() => seq.push(2));
    queueMicrotask(() => seq.push(3));
    seq.push(1);
    await time.delay(20);
    seq.push(4);
    assertEquals(seq, [1, 2, 3, 4]);
  } finally {
    time.restore();
  }
});

Deno.test("delay with abort", async () => {
  const time: FakeTime = new FakeTime();

  try {
    const seq = [];
    const abort = new AbortController();
    const { signal } = abort;
    const delayedPromise = time.delay(100, { signal });
    seq.push(1);
    await FakeTime.restoreFor(() => {
      setTimeout(() => {
        seq.push(2);
        abort.abort();
      }, 0);
    });
    await assertRejects(
      () => delayedPromise,
      DOMException,
      "Delay was aborted",
    );
    seq.push(3);
    assertEquals(seq, [1, 2, 3]);
  } finally {
    time.restore();
  }
});

Deno.test("runMicrotasks runs all microtasks before resolving", async () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();

  try {
    const seq = [];
    queueMicrotask(() => seq.push(2));
    queueMicrotask(() => seq.push(3));
    seq.push(1);
    await time.runMicrotasks();
    seq.push(4);
    assertEquals(seq, [1, 2, 3, 4]);
    assertEquals(Date.now(), start);
  } finally {
    time.restore();
  }
});

Deno.test("tickAsync runs all microtasks and runs timers if ticks past due", async () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
  const expected: SpyCall[] = [];
  const seq: number[] = [];

  try {
    setTimeout(cb, 1000);
    queueMicrotask(() => seq.push(2));
    queueMicrotask(() => seq.push(3));
    seq.push(1);
    await time.tickAsync(250);
    seq.push(4);
    assertEquals(cb.calls, expected);
    await time.tickAsync(250);
    assertEquals(cb.calls, expected);
    queueMicrotask(() => seq.push(6));
    seq.push(5);
    await time.tickAsync(500);
    seq.push(7);
    expected.push({ args: [], returned: 1000 });
    assertEquals(cb.calls, expected);
    assertEquals(Date.now(), start + 1000);
    assertEquals(seq, [1, 2, 3, 4, 5, 6, 7]);
  } finally {
    time.restore();
  }
});

Deno.test("runNext runs next timer without running microtasks", async () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
  const seq: number[] = [];

  try {
    setTimeout(cb, 1000);
    queueMicrotask(() => seq.push(3));
    queueMicrotask(() => seq.push(4));
    seq.push(1);
    time.next();
    seq.push(2);
    const expectedCalls = [{ args: [], returned: 1000 }];
    assertEquals(cb.calls, expectedCalls);
    assertEquals(Date.now(), start + 1000);
    await time.runMicrotasks();

    queueMicrotask(() => seq.push(7));
    queueMicrotask(() => seq.push(8));
    seq.push(5);
    time.next();
    seq.push(6);
    await time.runMicrotasks();

    assertEquals(cb.calls, expectedCalls);
    assertEquals(Date.now(), start + 1000);
    assertEquals(seq, [1, 2, 3, 4, 5, 6, 7, 8]);
  } finally {
    time.restore();
  }
});

Deno.test("runNextAsync runs all microtasks and next timer", async () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
  const seq: number[] = [];

  try {
    setTimeout(cb, 1000);
    queueMicrotask(() => seq.push(2));
    queueMicrotask(() => seq.push(3));
    seq.push(1);
    await time.nextAsync();
    seq.push(4);
    const expectedCalls = [{ args: [], returned: 1000 }];
    assertEquals(cb.calls, expectedCalls);
    assertEquals(Date.now(), start + 1000);

    queueMicrotask(() => seq.push(6));
    queueMicrotask(() => seq.push(7));
    seq.push(5);
    await time.nextAsync();
    seq.push(8);

    assertEquals(cb.calls, expectedCalls);
    assertEquals(Date.now(), start + 1000);
    assertEquals(seq, [1, 2, 3, 4, 5, 6, 7, 8]);
  } finally {
    time.restore();
  }
});

Deno.test("runAll runs all timers without running microtasks", async () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
  const seq: number[] = [];

  try {
    setTimeout(cb, 1000);
    setTimeout(cb, 1500);
    queueMicrotask(() => seq.push(3));
    queueMicrotask(() => seq.push(4));
    seq.push(1);
    time.runAll();
    seq.push(2);
    const expectedCalls = [
      { args: [], returned: 1000 },
      { args: [], returned: 1500 },
    ];
    assertEquals(cb.calls, expectedCalls);
    assertEquals(Date.now(), start + 1500);
    await time.runMicrotasks();

    queueMicrotask(() => seq.push(7));
    queueMicrotask(() => seq.push(8));
    seq.push(5);
    time.runAll();
    seq.push(6);
    await time.runMicrotasks();

    assertEquals(cb.calls, expectedCalls);
    assertEquals(Date.now(), start + 1500);
    assertEquals(seq, [1, 2, 3, 4, 5, 6, 7, 8]);
  } finally {
    time.restore();
  }
});

Deno.test("runAllAsync runs all microtasks and timers", async () => {
  const time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
  const seq: number[] = [];

  try {
    setTimeout(cb, 1000);
    setTimeout(cb, 1500);
    queueMicrotask(() => seq.push(2));
    queueMicrotask(() => seq.push(3));
    seq.push(1);
    await time.runAllAsync();
    seq.push(4);
    const expectedCalls = [
      { args: [], returned: 1000 },
      { args: [], returned: 1500 },
    ];
    assertEquals(cb.calls, expectedCalls);
    assertEquals(Date.now(), start + 1500);

    queueMicrotask(() => seq.push(6));
    queueMicrotask(() => seq.push(7));
    seq.push(5);
    await time.runAllAsync();
    seq.push(8);

    assertEquals(cb.calls, expectedCalls);
    assertEquals(Date.now(), start + 1500);
    assertEquals(seq, [1, 2, 3, 4, 5, 6, 7, 8]);
  } finally {
    time.restore();
  }
});

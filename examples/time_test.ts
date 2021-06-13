import { assertEquals } from "../deps.ts";
import { Spy, spy } from "../spy.ts";
import { FakeTime } from "../time.ts";

function secondInterval(cb: () => void): void {
  setInterval(cb, 1000);
}

Deno.test("calls callback every second", () => {
  const time: FakeTime = new FakeTime();
  const cb: Spy<void> = spy();

  try {
    secondInterval(cb);
    assertEquals(cb.calls.length, 0);
    time.tick(500);
    assertEquals(cb.calls.length, 0);
    time.tick(500);
    assertEquals(cb.calls.length, 1);
    time.tick(3500);
    assertEquals(cb.calls.length, 4);
  } finally {
    time.restore();
  }
});

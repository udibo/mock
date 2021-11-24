import { assertSpyCalls, FakeTime, Spy, spy } from "../mod.ts";

function secondInterval(cb: () => void): void {
  setInterval(cb, 1000);
}

Deno.test("calls callback every second", () => {
  const time: FakeTime = new FakeTime();
  const cb: Spy<void> = spy();

  try {
    secondInterval(cb);
    assertSpyCalls(cb, 0);
    time.tick(500);
    assertSpyCalls(cb, 0);
    time.tick(500);
    assertSpyCalls(cb, 1);
    time.tick(3500);
    assertSpyCalls(cb, 4);
  } finally {
    time.restore();
  }
});

import { assertEquals } from "../deps.ts";
import { assertSpyCall, assertSpyCalls, stub } from "../mod.ts";

class Cat {
  // deno-lint-ignore no-explicit-any
  action(_name: string): any {
    throw new Error("unimplemented");
  }
}

// deno-lint-ignore no-explicit-any
function doAction(cat: Cat, action: string): any {
  return cat.action(action);
}

Deno.test("doAction", () => {
  const cat = new Cat();
  const action = stub(cat, "action");

  assertEquals(doAction(cat, "walk"), undefined);
  assertSpyCall(action, 0, {
    self: cat,
    args: ["walk"],
    returned: undefined,
  });

  assertEquals(doAction(cat, "jump"), undefined);
  assertSpyCall(action, 1, {
    self: cat,
    args: ["jump"],
    returned: undefined,
  });

  assertSpyCalls(action, 2);
});

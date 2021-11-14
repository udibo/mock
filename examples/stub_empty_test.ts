import { assertEquals } from "../deps.ts";
import { Stub, stub } from "../stub.ts";

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
  const cat: Cat = new Cat();
  const action: Stub<Cat> = stub(cat, "action");

  try {
    assertEquals(doAction(cat, "walk"), undefined);
    assertEquals(doAction(cat, "jump"), undefined);
  } finally {
    action.restore();
  }
});

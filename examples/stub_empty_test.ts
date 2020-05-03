import { assertEquals } from "../deps/std/testing/asserts.ts";
import { stub, Stub } from "../stub.ts";

class Cat {
  action(name: string): any {
    throw new Error("unimplemented");
  }
}

function doAction(cat: Cat, action: string): any {
  return cat.action(action);
}

Deno.test("doAction", () => {
  const cat: Cat = new Cat();
  const action: Stub<Cat> = stub(cat, "action");

  assertEquals(doAction(cat, "walk"), undefined);
  assertEquals(doAction(cat, "jump"), undefined);

  action.returns = ["hello", "world"];
  assertEquals(doAction(cat, "say hello"), "hello");
  assertEquals(doAction(cat, "say world"), "world");
  assertEquals(doAction(cat, "say bye"), undefined);

  action.restore();
});

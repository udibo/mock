/** This module is browser compatible. */
export {
  SpyError,
  SpyCall,
  Spy,
  spy,
} from "./spy.ts";
export {
  Stub,
  stub,
} from "./stub.ts";
export {
  NativeTime,
  FakeTime,
  FakeDate,
  FakeDateConstructor,
  TimeError,
} from "./time.ts";
export {
  assertPassthrough,
} from "./asserts.ts";
export {
  fromNow,
  returnsThis,
  returnsArg,
  returnsArgs,
  throws,
  resolves,
  rejects,
} from "./callbacks.ts";

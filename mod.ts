/** This module is browser compatible. */

export {
  SpyError,
  spy,
} from "./spy.ts";
export type {
  SpyCall,
  Spy,
} from "./spy.ts";
export { stub } from "./stub.ts";
export type { Stub } from "./stub.ts";
export {
  NativeDate,
  NativeTime,
  FakeTime,
  FakeDate,
  TimeError,
} from "./time.ts";
export type {
  NativeDateConstructor,
  FakeDateConstructor,
} from "./time.ts";
export {
  fromNow,
  returnsThis,
  returnsArg,
  returnsArgs,
  throws,
  resolves,
  rejects,
} from "./callbacks.ts";

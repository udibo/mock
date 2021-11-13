/** This module is browser compatible. */

export { spy, SpyError } from "./spy.ts";
export type { Spy, SpyCall } from "./spy.ts";

export { stub } from "./stub.ts";
export type { Stub } from "./stub.ts";

export {
  FakeDate,
  FakeTime,
  NativeDate,
  NativeTime,
  TimeError,
} from "./time.ts";
export type { FakeDateConstructor, NativeDateConstructor } from "./time.ts";

export { returnsArg, returnsArgs, returnsThis } from "./callbacks.ts";

export {
  assertPassthrough,
  assertSpyCall,
  assertSpyCallArg,
  assertSpyCallArgs,
  assertSpyCallAsync,
  assertSpyCalls,
  assertSpyCallsMin,
} from "./asserts.ts";
export type {
  PassthroughOptions,
  PassthroughOptionsFunc,
  PassthroughOptionsInstance,
  PassthroughTarget,
} from "./asserts.ts";

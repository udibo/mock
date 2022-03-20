/** This module is browser compatible. */

export {
  MockError,
  mockSession,
  mockSessionAsync,
  restore,
  spy,
  stub,
} from "./mock.ts";
export type { Spy, SpyCall, Stub } from "./mock.ts";

export {
  resolvesNext,
  returnsArg,
  returnsArgs,
  returnsNext,
  returnsThis,
} from "./callbacks.ts";

export {
  assertSpyCall,
  assertSpyCallArg,
  assertSpyCallArgs,
  assertSpyCallAsync,
  assertSpyCalls,
} from "./asserts.ts";
export type { ExpectedSpyCall } from "./asserts.ts";

export {
  FakeDate,
  FakeTime,
  NativeDate,
  NativeTime,
  TimeError,
} from "./time.ts";
export type { FakeDateConstructor, NativeDateConstructor } from "./time.ts";

/** This module is browser compatible. */
import { applyMixins } from "./deps/udibo/mixins/apply.ts";
import { BinaryHeap, ascend } from "./deps/udibo/collections/binary_heap.ts";

type NativeDate = Date;
type NativeDateConstructor = DateConstructor;

export const NativeTime = {
  Date,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};

/** An error related to faking time. */
export class TimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeError";
  }
}

function isFakeDate(instance: any): instance is FakeDate {
  return instance instanceof FakeDate;
}

export interface FakeDate extends NativeDate {
  date: Date;
}
export interface FakeDateConstructor extends NativeDateConstructor {
  new (): FakeDate;
  new (value: string | number | NativeDate): FakeDate;
  new (
    year: number,
    month: number,
    date?: number,
    hours?: number,
    minutes?: number,
    seconds?: number,
    ms?: number,
  ): FakeDate;
  (): string;
  readonly prototype: FakeDate;
  parse(s: string): number;
  UTC(
    year: number,
    month: number,
    date?: number,
    hours?: number,
    minutes?: number,
    seconds?: number,
    ms?: number,
  ): number;
  now(): number;
}
function FakeDateConstructor(this: void): string;
function FakeDateConstructor(this: FakeDate): void;
function FakeDateConstructor(
  this: FakeDate,
  value: string | number | NativeDate,
): void;
function FakeDateConstructor(
  this: FakeDate,
  year: number,
  month: number,
  date?: number,
  hours?: number,
  minutes?: number,
  seconds?: number,
  ms?: number,
): void;
function FakeDateConstructor(
  this: FakeDate | void,
  ...args: any[]
): string | void {
  if (args.length === 0) args.push(FakeDate.now());
  if (isFakeDate(this)) {
    this.date = new NativeTime.Date(...(args as []));
  } else {
    return new NativeTime.Date(args[0]).toString();
  }
}
class FakeDateMixin {
  static now(): number {
    return time?.now ?? NativeTime.Date.now();
  }

  [Symbol.toPrimitive](this: FakeDate, hint: "default"): string;
  [Symbol.toPrimitive](this: FakeDate, hint: "string"): string;
  [Symbol.toPrimitive](this: FakeDate, hint: "number"): number;
  [Symbol.toPrimitive](this: FakeDate, hint: string): string | number {
    return this.date[Symbol.toPrimitive].apply(
      this.date,
      Array.from(arguments) as [string],
    );
  }
}
applyMixins(FakeDateConstructor, [FakeDateMixin]);
export const FakeDate: FakeDateConstructor =
  FakeDateConstructor as FakeDateConstructor;
FakeDate.parse = Date.parse;
FakeDate.UTC = Date.UTC;
Object.getOwnPropertyNames(Date.prototype).forEach((name: string) => {
  const propName: keyof NativeDate = name as keyof NativeDate;
  FakeDate.prototype[propName] = function (
    this: FakeDate,
    ...args: any[]
  ): any {
    return (this.date[propName] as (...args: any[]) => any).apply(
      this.date,
      args,
    );
  };
});

function* timeoutId() {
  let i = 1;
  while (true) yield i++;
}
interface Timeout {
  id: number;
  at: number;
  callback: (...args: any[]) => void;
  args: any[];
}
interface Interval extends Timeout {
  step: number;
}

let time: FakeTime | undefined = undefined;
export class FakeTime {
  private _now: number;
  private _start: number;
  private timeoutId: Generator<number>;
  private ignoreTimeouts: Set<number>;
  private timeouts: BinaryHeap<Timeout>;
  private intervals: BinaryHeap<Interval>;

  constructor(start?: number | string | NativeDate) {
    FakeTime.restore();
    this._start = start instanceof NativeTime.Date
      ? start.valueOf()
      : typeof start === "number"
      ? start
      : typeof start === "string"
      ? (new Date(start)).valueOf()
      : NativeTime.Date.now();
    if (Number.isNaN(this._start)) throw new TimeError("invalid start");
    this._now = this._start;

    this.timeoutId = timeoutId();
    this.ignoreTimeouts = new Set();
    this.timeouts = new BinaryHeap(
      (a: Timeout, b: Timeout) => ascend(a.at, b.at),
    );
    this.intervals = new BinaryHeap(
      (a: Interval, b: Interval) => ascend(a.at, b.at),
    );

    time = this;
    globalThis.Date = FakeDate;
    globalThis.setTimeout = FakeTime.setTimeout;
    globalThis.clearTimeout = FakeTime.clearTimeout;
    globalThis.setInterval = FakeTime.setInterval;
    globalThis.clearInterval = FakeTime.clearInterval;
  }

  static restore(): void {
    if (time) {
      time.restore();
      console.error("already using fake time");
    }
  }

  static setTimeout(
    callback: (...args: any[]) => void,
    delay: number = 0,
    ...args: any[]
  ): number {
    if (!time) throw new TimeError("no fake time");
    const timeout: Timeout = {
      callback,
      args,
      at: time.now + (delay > 0 ? delay : 0),
      id: time.timeoutId.next().value,
    };
    time.timeouts.push(timeout);
    return timeout.id;
  }
  static clearTimeout(timeoutId?: number): void {
    if (!time) throw new TimeError("no fake time");
    if (typeof timeoutId === "number") time.ignoreTimeouts.add(timeoutId);
  }

  static setInterval(
    callback: (...args: any[]) => void,
    delay: number = 0,
    ...args: any[]
  ): number {
    if (!time) throw new TimeError("no fake time");
    const step: number = delay > 0 ? delay : 0;
    const interval: Interval = {
      callback,
      args,
      step,
      at: time.now + step,
      id: time.timeoutId.next().value,
    };
    time.intervals.push(interval);
    return interval.id;
  }
  static clearInterval(timeoutId?: number): void {
    if (!time) throw new TimeError("no fake time");
    if (typeof timeoutId === "number") time.ignoreTimeouts.add(timeoutId);
  }

  /** The amount of milliseconds elapsed since January 1, 1970 00:00:00 UTC for the fake time. */
  get now(): number {
    return this._now;
  }
  set now(value: number) {
    if (value < this._now) throw new Error("time cannot go backwards");
    let done: boolean = false;
    let timeout: Timeout | undefined;
    let interval: Interval | undefined;
    do {
      done = true;
      timeout = this.timeouts.peek();
      interval = this.intervals.peek();
      if (timeout && this.ignoreTimeouts.has(timeout.id)) {
        this.ignoreTimeouts.delete(timeout.id);
        this.timeouts.pop();
        done = false;
      } else if (interval && this.ignoreTimeouts.has(interval.id)) {
        this.ignoreTimeouts.delete(interval.id);
        this.intervals.pop();
        done = false;
      } else if (
        timeout && timeout.at <= value &&
        (!interval || timeout.at < interval.at)
      ) {
        this._now = timeout.at;
        this.timeouts.pop();
        timeout.callback.apply(null, timeout.args);
        done = false;
      } else if (interval && interval.at <= value) {
        this._now = interval.at;
        this.intervals.pop();
        this.intervals.push({
          ...interval,
          at: interval.at + interval.step,
        });
        interval.callback.apply(null, interval.args);
        done = false;
      }
    } while (!done);
    this._now = value;
  }

  /** The initial amount of milliseconds elapsed since January 1, 1970 00:00:00 UTC for the fake time. */
  get start(): number {
    return this._start;
  }
  set start(value: number) {
    throw new Error("cannot change start time after initialization");
  }

  /** Adds the specified number of milliseconds to the fake time. */
  tick(ms: number) {
    this.now += ms;
  }

  /** Restores time related global functions to their original state. */
  restore(): void {
    if (!time) throw new TimeError("time already restored");
    time = undefined;
    globalThis.Date = NativeTime.Date;
    globalThis.setTimeout = NativeTime.setTimeout;
    globalThis.clearTimeout = NativeTime.clearTimeout;
    globalThis.setInterval = NativeTime.setInterval;
    globalThis.clearInterval = NativeTime.clearInterval;
  }
}

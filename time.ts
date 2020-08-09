/** This module is browser compatible. */

import { applyMixins } from "./deps/udibo/mixins/apply.ts";
import { Vector } from "./deps/udibo/collections/vector.ts";
import { RBTree } from "./deps/udibo/collections/trees/rb_tree.ts";
import { ascend } from "./deps/udibo/collections/comparators.ts";
import { delay as delayNative } from "./deps/std/async/delay.ts";

export type NativeDate = Date;
export type NativeDateConstructor = DateConstructor;
export const NativeDate: NativeDateConstructor = Date;

export const NativeTime = {
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};

/** Resolves after the given number of milliseconds using real time. */
export function delay(ms: number): Promise<void> {
  return time
    ? FakeTime.restoreFor(() => {
      return delayNative(ms);
    })
    : delayNative(ms);
}

/** An error related to faking time. */
export class TimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeError";
  }
}

// deno-lint-ignore no-explicit-any
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
  // deno-lint-ignore no-explicit-any
  ...args: any[]
): string | void {
  if (args.length === 0) args.push(FakeDate.now());
  if (isFakeDate(this)) {
    this.date = new NativeDate(...(args as []));
  } else {
    return new NativeDate(args[0]).toString();
  }
}
class FakeDateMixin {
  static now(): number {
    return time?.now ?? NativeDate.now();
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
    // deno-lint-ignore no-explicit-any
    ...args: any[]
    // deno-lint-ignore no-explicit-any
  ): any {
    // deno-lint-ignore no-explicit-any
    return (this.date[propName] as (...args: any[]) => any).apply(
      this.date,
      args,
    );
  };
});

function* timerId() {
  let i = 1;
  while (true) yield i++;
}
interface Timer {
  id: number;
  // deno-lint-ignore no-explicit-any
  callback: (...args: any[]) => void;
  delay: number;
  // deno-lint-ignore no-explicit-any
  args: any[];
  due: number;
  repeat: boolean;
}

export interface FakeTimeOptions {
  /**
   * The rate relative to real time at which fake time is updated.
   * By default time only moves forward through calling tick or setting now.
   * Set to 1 to have the fake time automatically tick foward at the same rate in milliseconds as real time.
   */
  advanceRate: number;
  /**
   * The frequency in milliseconds at which fake time is updated.
   * If advanceRate is set, we will update the time every 10 milliseconds by default.
   */
  advanceFrequency?: number;
}

interface DueNode {
  due: number;
  timers: Vector<Timer>;
}

let time: FakeTime | undefined = undefined;
/**
 * Overrides real Date object and timer functions with fake ones that can be
 * controlled through the fake time instance.
 */
export class FakeTime {
  private _now: number;
  private _start: number;
  private initializedAt: number;
  private advanceRate: number;
  private advanceFrequency: number;
  private advanceIntervalId?: number;

  private timerId: Generator<number>;
  private dueNodes: Map<number, DueNode>;
  private dueTree: RBTree<DueNode>;

  constructor(
    start?: number | string | NativeDate | null,
    options?: FakeTimeOptions,
  ) {
    FakeTime.restore();
    this.initializedAt = NativeDate.now();
    this._start = start instanceof NativeDate
      ? start.valueOf()
      : typeof start === "number"
      ? Math.floor(start)
      : typeof start === "string"
      ? (new Date(start)).valueOf()
      : this.initializedAt;
    if (Number.isNaN(this._start)) throw new TimeError("invalid start");
    this._now = this._start;

    this.timerId = timerId();
    this.dueNodes = new Map();
    this.dueTree = new RBTree(
      (a: Partial<DueNode>, b: Partial<DueNode>) => ascend(a.due, b.due),
    );

    this.overrideGlobals();
    time = this;

    this.advanceRate = Math.max(
      0,
      options?.advanceRate ? options.advanceRate : 0,
    );
    this.advanceFrequency = Math.max(
      0,
      options?.advanceFrequency ? options.advanceFrequency : 10,
    );
    if (this.advanceRate > 0) {
      this.advanceIntervalId = NativeTime.setInterval.call(null, () => {
        this.tick(this.advanceRate * this.advanceFrequency);
      }, this.advanceFrequency);
    }
  }

  static restore(): void {
    if (time) {
      time.restore();
      console.error("already using fake time");
    }
  }

  static setTimeout(
    // deno-lint-ignore no-explicit-any
    callback: (...args: any[]) => void,
    delay = 0,
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): number {
    if (!time) throw new TimeError("no fake time");
    return time.setTimer(callback, delay, args, false);
  }
  static clearTimeout(id?: number): void {
    if (!time) throw new TimeError("no fake time");
    if (typeof id === "number" && time.dueNodes.has(id)) {
      time.dueNodes.delete(id);
    }
  }

  static setInterval(
    // deno-lint-ignore no-explicit-any
    callback: (...args: any[]) => void,
    delay = 0,
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): number {
    if (!time) throw new TimeError("no fake time");
    return time.setTimer(callback, delay, args, true);
  }
  static clearInterval(id?: number): void {
    if (!time) throw new TimeError("no fake time");
    if (typeof id === "number" && time.dueNodes.has(id)) {
      time.dueNodes.delete(id);
    }
  }

  private overrideGlobals(): void {
    globalThis.Date = FakeDate;
    globalThis.setTimeout = FakeTime.setTimeout;
    globalThis.clearTimeout = FakeTime.clearTimeout;
    globalThis.setInterval = FakeTime.setInterval;
    globalThis.clearInterval = FakeTime.clearInterval;
  }

  private restoreGlobals(): void {
    globalThis.Date = NativeDate;
    globalThis.setTimeout = NativeTime.setTimeout;
    globalThis.clearTimeout = NativeTime.clearTimeout;
    globalThis.setInterval = NativeTime.setInterval;
    globalThis.clearInterval = NativeTime.clearInterval;
  }

  private setTimer(
    // deno-lint-ignore no-explicit-any
    callback: (...args: any[]) => void,
    delay = 0,
    // deno-lint-ignore no-explicit-any
    args: any[],
    repeat = false,
  ): number {
    const id: number = this.timerId.next().value;
    delay = Math.max(repeat ? 1 : 0, Math.floor(delay));
    const due: number = this.now + delay;
    let dueNode: DueNode | null = this.dueTree.find({ due });
    if (dueNode === null) {
      dueNode = { due, timers: new Vector() };
      this.dueTree.insert(dueNode);
    }
    dueNode.timers.push({
      id,
      callback,
      args,
      delay,
      due,
      repeat,
    });
    this.dueNodes.set(id, dueNode);
    return id;
  }

  /** Restores real time temporarily until callback returns and resolves. */
  static async restoreFor(
    // deno-lint-ignore no-explicit-any
    callback: (...args: any[]) => Promise<any>,
    // deno-lint-ignore no-explicit-any
    ...args: any[]
    // deno-lint-ignore no-explicit-any
  ): Promise<any> {
    if (!time) throw new TimeError("no fake time");
    // deno-lint-ignore no-explicit-any
    let result: any;
    time.restoreGlobals();
    try {
      result = await callback.apply(null, args);
    } finally {
      time.overrideGlobals();
    }
    return result;
  }

  /**
   * The amount of milliseconds elapsed since January 1, 1970 00:00:00 UTC for the fake time.
   * When set, it will call any functions waiting to be called between the current and new fake time.
   */
  get now(): number {
    return this._now;
  }
  set now(value: number) {
    if (value < this._now) throw new Error("time cannot go backwards");
    let dueNode: DueNode | null = this.dueTree.min();
    while (dueNode && dueNode.due <= value) {
      const timer: Timer | undefined = dueNode.timers.shift();
      if (timer && this.dueNodes.has(timer.id)) {
        this._now = timer.due;
        if (timer.repeat) {
          const due: number = timer.due + timer.delay;
          let dueNode: DueNode | null = this.dueTree.find({ due });
          if (dueNode === null) {
            dueNode = { due, timers: new Vector() };
            this.dueTree.insert(dueNode);
          }
          dueNode.timers.push({ ...timer, due });
          this.dueNodes.set(timer.id, dueNode);
        } else {
          this.dueNodes.delete(timer.id);
        }
        timer.callback.apply(null, timer.args);
      } else if (!timer) {
        this.dueTree.remove(dueNode);
        dueNode = this.dueTree.min();
      }
    }
    this._now = value;
  }

  /** The initial amount of milliseconds elapsed since January 1, 1970 00:00:00 UTC for the fake time. */
  get start(): number {
    return this._start;
  }
  set start(value: number) {
    throw new Error("cannot change start time after initialization");
  }

  /**
   * Adds the specified number of milliseconds to the fake time.
   * This will call any functions waiting to be called between the current and new fake time.
   */
  tick(ms = 0) {
    this.now += ms;
  }

  /** Restores time related global functions to their original state. */
  restore(): void {
    if (!time) throw new TimeError("time already restored");
    time = undefined;
    this.restoreGlobals();
    if (this.advanceIntervalId) clearInterval(this.advanceIntervalId);
  }
}

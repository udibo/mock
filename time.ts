/** This module is browser compatible. */

import { applyMixins, ascend, DelayOptions, RBTree } from "./time_deps.ts";

export type NativeDate = Date;
export type NativeDateConstructor = DateConstructor;
export const NativeDate: NativeDateConstructor = Date;

export const NativeTime = {
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

function isFakeDate(instance: unknown): instance is FakeDate {
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
  declare date: NativeDate;

  static now(): number {
    return time?.now ?? NativeDate.now();
  }

  [Symbol.toPrimitive](hint: "default"): string;
  [Symbol.toPrimitive](hint: "string"): string;
  [Symbol.toPrimitive](hint: "number"): number;
  [Symbol.toPrimitive](_hint: string): string | number {
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
Object.getOwnPropertySymbols(Date.prototype).forEach((name: symbol) => {
  const propName: keyof NativeDate = name as unknown as keyof NativeDate;
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
  args: unknown[];
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
  timers: Timer[];
}

let time: FakeTime | undefined = undefined;
/**
 * Overrides the real Date object and timer functions with fake ones that can be
 * controlled through the fake time instance.
 *
 * @deprecated Use https://deno.land/std/testing/time.ts instead.
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
    if (time) time.restore();
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
      (a: DueNode, b: DueNode) => ascend(a.due, b.due),
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
    if (!time) throw new TimeError("time already restored");
    time.restore();
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
    callback: (...args: any[]) => unknown,
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
    globalThis.setTimeout = FakeTime.setTimeout as typeof NativeTime.setTimeout;
    globalThis.clearTimeout = FakeTime.clearTimeout;
    globalThis.setInterval = FakeTime
      .setInterval as typeof NativeTime.setInterval;
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
    args: unknown[],
    repeat = false,
  ): number {
    const id: number = this.timerId.next().value;
    delay = Math.max(repeat ? 1 : 0, Math.floor(delay));
    const due: number = this.now + delay;
    let dueNode: DueNode | null = this.dueTree.find({ due } as DueNode);
    if (dueNode === null) {
      dueNode = { due, timers: [] };
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

  /**
   * Restores real time temporarily until callback returns and resolves.
   */
  static async restoreFor<T>(
    // deno-lint-ignore no-explicit-any
    callback: (...args: any[]) => Promise<T> | T,
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): Promise<T> {
    if (!time) throw new TimeError("no fake time");
    let result: T;
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
   * If the timer callback throws, time will stop advancing forward beyond that timer.
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
          let dueNode: DueNode | null = this.dueTree.find({ due } as DueNode);
          if (dueNode === null) {
            dueNode = { due, timers: [] };
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

  /** Resolves after the given number of milliseconds using real time. */
  async delay(ms: number, options: DelayOptions = {}): Promise<void> {
    const { signal } = options;
    if (signal?.aborted) {
      return Promise.reject(
        new DOMException("Delay was aborted.", "AbortError"),
      );
    }
    return await new Promise((resolve, reject) => {
      let timer: number | null = null;
      const abort = () =>
        FakeTime
          .restoreFor(() => {
            if (timer) clearTimeout(timer);
          })
          .then(() =>
            reject(new DOMException("Delay was aborted.", "AbortError"))
          );
      const done = () => {
        signal?.removeEventListener("abort", abort);
        resolve();
      };
      FakeTime.restoreFor(() => setTimeout(done, ms))
        .then((id) => timer = id);
      signal?.addEventListener("abort", abort, { once: true });
    });
  }

  /** Runs all pending microtasks. */
  async runMicrotasks(): Promise<void> {
    await this.delay(0);
  }

  /**
   * Adds the specified number of milliseconds to the fake time.
   * This will call any functions waiting to be called between the current and new fake time.
   */
  tick(ms = 0): void {
    this.now += ms;
  }

  /**
   * Runs all pending microtasks then adds the specified number of milliseconds to the fake time.
   * This will call any functions waiting to be called between the current and new fake time.
   */
  async tickAsync(ms = 0): Promise<void> {
    await this.runMicrotasks();
    this.now += ms;
  }

  /**
   * Advances time to when the next scheduled timer is due.
   * If there are no pending timers, time will not be changed.
   * Returns true when there is a scheduled timer and false when there is not.
   */
  next(): boolean {
    const next = this.dueTree.min();
    if (next) this.now = next.due;
    return !!next;
  }

  /**
   * Runs all pending microtasks then advances time to when the next scheduled timer is due.
   * If there are no pending timers, time will not be changed.
   */
  async nextAsync(): Promise<boolean> {
    await this.runMicrotasks();
    return this.next();
  }

  /**
   * Advances time forward to the next due timer until there are no pending timers remaining.
   * If the timers create additional timers, they will be run too. If there is an interval,
   * time will keep advancing forward until the interval is cleared.
   */
  runAll(): void {
    while (!this.dueTree.isEmpty()) {
      this.next();
    }
  }

  /**
   * Advances time forward to the next due timer until there are no pending timers remaining.
   * If the timers create additional timers, they will be run too. If there is an interval,
   * time will keep advancing forward until the interval is cleared.
   * Runs all pending microtasks before each timer.
   */
  async runAllAsync(): Promise<void> {
    while (!this.dueTree.isEmpty()) {
      await this.nextAsync();
    }
  }

  /** Restores time related global functions to their original state. */
  restore(): void {
    if (!time) throw new TimeError("time already restored");
    time = undefined;
    this.restoreGlobals();
    if (this.advanceIntervalId) clearInterval(this.advanceIntervalId);
  }
}

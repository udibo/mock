# Mock

[![version](https://img.shields.io/badge/release-v0.3.0-success)](https://github.com/udibo/mock/tree/v0.3.0)
[![CI](https://github.com/udibo/mock/workflows/CI/badge.svg)](https://github.com/udibo/mock/actions?query=workflow%3ACI)
[![deno version](https://img.shields.io/badge/deno-v1.0.0-success)](https://github.com/denoland/deno/tree/v1.0.0)
[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/mock/mod.ts)
[![license](https://img.shields.io/github/license/udibo/mock)](https://github.com/udibo/mock/blob/master/LICENSE)

This module provides utilities to help mock behavior and spy on function calls for tests.

## Usage

`spy.ts` module provides utilities for spying on functions and instance methods without changing behavior.

`stub.ts` module provides utilities for spying on instance methods and faking how they respond to calls.

### Spy<T\>

A function or instance method wrapper that records all calls.

When spying on a function, all arguments and return values are recorded but the behavior of that function is unchanged. This gives you the ability to verify that the code you are testing calls functions it depends on correctly and that they return the responses you expect them to.

#### .calls: [SpyCall](#spycall)\[\]

Information about calls made to the function or instance method being spied on.

#### .restore\(\): void

Removes spy wrapper from instance method.

### SpyCall

An object containing call information recorded by a spy.

#### .args: any\[\]

Arguments passed to a function when called.

#### .self?: any

The instance that a method was called on.

#### .error?: any

The error value that was thrown by a function.

#### .returned?: any

The value that was returned by a function.

### SpyError extends Error

An error related to spying on a function or instance method.

### spy<T\>\(funcOrObj?: Function | T, method?: string\): [Spy<T\>](#spyt) | [Spy<void\>](#spyt)

Wraps a function or instance method with a [Spy](#spyt).

If you have a function that takes a callback but you don't need it to do anything, you can create an empty spy. An empty spy will just return undefined for any calls made to it.

```ts
import { assertEquals } from "https://deno.land/std@0.50.0/testing/asserts.ts";
import { spy, Spy } from "https://raw.githubusercontent.com/udibo/mock/v0.3.0/spy.ts";

function add(
  a: number,
  b: number,
  callback: (error: Error | void, value?: number) => void,
): void {
  const value: number = a + b;
  if (typeof value === "number" && value !== NaN) callback(undefined, value);
  else callback(new Error("invalid input"));
}

Deno.test("calls fake callback", () => {
  const callback: Spy<void> = spy();

  assertEquals(add(2, 3, callback), undefined);
  assertEquals(add(5, 4, callback), undefined);
  assertEquals(callback.calls, [
    { args: [undefined, 5] },
    { args: [undefined, 9] },
  ]);
});
```

If you have a function that takes a callback that needs to still behave normally, you can wrap it with a spy.

```ts
import { assertEquals } from "https://deno.land/std@0.50.0/testing/asserts.ts";
import { spy, Spy } from "https://raw.githubusercontent.com/udibo/mock/v0.3.0/spy.ts";

function filter<T>(values: T[], callback: (value: T) => boolean): any[] {
  return values.filter(callback);
}

function isEven(value: number): boolean {
  return value % 2 === 0;
}

Deno.test("calls real callback", () => {
  const callback: Spy<void> = spy(isEven);
  const values: number[] = [5, 6, 7, 8];

  assertEquals(filter(values, callback), [6, 8]);
  assertEquals(callback.calls, [
    { args: [5, 0, values], returned: false },
    { args: [6, 1, values], returned: true },
    { args: [7, 2, values], returned: false },
    { args: [8, 3, values], returned: true },
  ]);
});
```

If you have an instance method that needs to still behave normally, you can wrap it with a spy. When you are done spying on a method, you need to call the restore function on the spy object to remove the wrapper from the instance method. If it is not restored and you attempt to wrap it again, it will throw a spy error saying "already spying on function".

```ts
import { assertEquals } from "https://deno.land/std@0.50.0/testing/asserts.ts";
import { spy, Spy } from "https://raw.githubusercontent.com/udibo/mock/v0.3.0/spy.ts";

class Database {
  private queries: any;
  constructor() {
    this.queries = {
      "select id, first_name from USERS where last_name=?": {
        "Doe": [[1, "Jane"], [2, "John"]],
        "Smith": [[3, "Jane"]],
      },
      "select id, last_name from USERS where first_name=?": {
        "Jane": [[1, "Doe"], [3, "Smith"]],
        "John": [[2, "Doe"]],
      },
    };
  }
  query(query: string, params: any[]): any[][] {
    return this.queries[query][params[0]]; // implementation not important for example
  }
}

function getNamesByFirstName(db: Database, firstName: string) {
  return db
    .query(
      "select id, last_name from USERS where first_name=?",
      [firstName],
    )
    .map((row) => `${firstName} ${row[1]}`);
}

function getNamesByLastName(db: Database, lastName: string) {
  return db
    .query(
      "select id, first_name from USERS where last_name=?",
      [lastName],
    )
    .map((row) => `${row[1]} ${lastName}`);
}

Deno.test("functions call db.query", () => {
  const db: Database = new Database();
  const query: Spy<Database> = spy(db, "query");

  assertEquals(getNamesByFirstName(db, "Jane"), ["Jane Doe", "Jane Smith"]);
  assertEquals(getNamesByLastName(db, "Doe"), ["Jane Doe", "John Doe"]);
  assertEquals(getNamesByFirstName(db, "John"), ["John Doe"]);
  assertEquals(getNamesByLastName(db, "Smith"), ["Jane Smith"]);
  assertEquals(query.calls, [
    {
      args: ["select id, last_name from USERS where first_name=?", ["Jane"]],
      self: db,
      returned: [[1, "Doe"], [3, "Smith"]],
    },
    {
      args: ["select id, first_name from USERS where last_name=?", ["Doe"]],
      self: db,
      returned: [[1, "Jane"], [2, "John"]],
    },
    {
      args: ["select id, last_name from USERS where first_name=?", ["John"]],
      self: db,
      returned: [[2, "Doe"]],
    },
    {
      args: ["select id, first_name from USERS where last_name=?", ["Smith"]],
      self: db,
      returned: [[3, "Jane"]],
    },
  ]);

  query.restore();
});
```

### Stub<T\> extends [Spy<T\>](#spyt)

An instance method wrapper that overrides the original method and records all calls made to it.

#### .returns: any\[\]

A queue of values that the stub will return.

### stub<T\>\(instance: T, method: string, arrOrFunc: any\[\] | Function\): [Stub<T\>](#stubt-extends-spyt)

Wraps an instance method with a [Stub](#stubt-extends-spyt).

If you have an instance method but you don't need it to do anything, you can create an empty stub. An empty stub will just return undefined for any calls made to it. If you need it to return specific values instead, you can add return values after initialization by replacing or adding to the `stub.returns` queue. When the returns queue is empty, it will return undefined.

```ts
import { assertEquals } from "https://deno.land/std@0.50.0/testing/asserts.ts";
import { stub, Stub } from "https://raw.githubusercontent.com/udibo/mock/v0.3.0/stub.ts";

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
```

If you have an instance method but need it to return specific values for each call, you can create a stub with an array of values in the order that you want them returned. You can add more return values after initialization by replacing or adding to the `stub.returns` queue.

```ts
import { assertEquals } from "https://deno.land/std@0.50.0/testing/asserts.ts";
import { stub, Stub } from "https://raw.githubusercontent.com/udibo/mock/v0.3.0/stub.ts";

class Database {
  query(query: string, params: any[]): any[][] {
    throw new Error("unimplemented");
  }
}

function getUsers(
  db: Database,
  lastName: string,
  firstName?: string,
): string[] {
  return db.query(
    "SELECT id, username FROM users WHERE last_name=?" +
      (firstName ? " and first_name=?" : ""),
    firstName ? [lastName, firstName] : [lastName],
  )
    .map((row) => `${row[0]} ${row[1]}`);
}

Deno.test("getUsers", () => {
  const db: Database = new Database();
  const query: Stub<Database> = stub(db, "query", [
    [[1, "jd"], [2, "johnd"], [3, "janedoe"]],
    [[2, "johnd"]],
  ]);

  assertEquals(getUsers(db, "doe"), ["1 jd", "2 johnd", "3 janedoe"]);
  assertEquals(getUsers(db, "doe", "john"), ["2 johnd"]);

  query.returns.push([[3, "janedoe"]]);
  assertEquals(getUsers(db, "doe"), ["3 janedoe"]);

  assertEquals(query.calls, [
    {
      args: [
        "SELECT id, username FROM users WHERE last_name=?",
        ["doe"],
      ],
      self: db,
      returned: [[1, "jd"], [2, "johnd"], [3, "janedoe"]],
    },
    {
      args: [
        "SELECT id, username FROM users WHERE last_name=? and first_name=?",
        ["doe", "john"],
      ],
      self: db,
      returned: [[2, "johnd"]],
    },
    {
      args: [
        "SELECT id, username FROM users WHERE last_name=?",
        ["doe"],
      ],
      self: db,
      returned: [[3, "janedoe"]],
    },
  ]);

  query.restore();
});
```

If you have an instance method but need it to call a replacement function instead of the original, you can create a stub with a replacement function. If you need it to return specific values instead, you can add return values after initialization by replacing or adding to the `stub.returns` queue. When the returns queue is empty, it will call the replacement function.

```ts
import { assertEquals } from "https://deno.land/std@0.50.0/testing/asserts.ts";
import { stub, Stub } from "https://raw.githubusercontent.com/udibo/mock/v0.3.0/stub.ts";

class Database {
  query(query: string, params: any[]): any[][] {
    throw new Error("unimplemented");
  }
}

function getUsers(
  db: Database,
  lastName: string,
  firstName?: string,
): string[] {
  return db.query(
    "SELECT id, username FROM users WHERE last_name=?" +
      (firstName ? " and first_name=?" : ""),
    firstName ? [lastName, firstName] : [lastName],
  )
    .map((row) => `${row[0]} ${row[1]}`);
}

Deno.test("getUsers", () => {
  const db: Database = new Database();
  const returns: [number, string][][] = [
    [[1, "jd"], [2, "johnd"], [3, "janedoe"]],
    [[2, "johnd"]],
  ];
  const query: Stub<Database> = stub(db, "query", () => returns.shift());

  assertEquals(getUsers(db, "doe"), ["1 jd", "2 johnd", "3 janedoe"]);
  assertEquals(getUsers(db, "doe", "john"), ["2 johnd"]);

  query.returns.push([[3, "janedoe"]]);
  assertEquals(getUsers(db, "doe"), ["3 janedoe"]);

  assertEquals(query.calls, [
    {
      args: [
        "SELECT id, username FROM users WHERE last_name=?",
        ["doe"],
      ],
      self: db,
      returned: [[1, "jd"], [2, "johnd"], [3, "janedoe"]],
    },
    {
      args: [
        "SELECT id, username FROM users WHERE last_name=? and first_name=?",
        ["doe", "john"],
      ],
      self: db,
      returned: [[2, "johnd"]],
    },
    {
      args: [
        "SELECT id, username FROM users WHERE last_name=?",
        ["doe"],
      ],
      self: db,
      returned: [[3, "janedoe"]],
    },
  ]);

  query.restore();
});

```

### returnsThis\(\): \(...args: any\[\]\) => ThisType<any\>

Creates a function that returns the instance the method was called on.

### returnsArg\(idx: number\): \(...args: any\[\]\) => any

Creates a function that returns one of its arguments.

### returnsArgs\(start: number = 0, end?: number\): \(...args: any\[\]\) => any

Creates a function that returns its arguments or a subset of them. If end is specified, it will return arguments up to but not including the end.

### throws\(error: any\): \(...args: any\[\]\) => any

Creates a function that throws a specific error.

### resolves\(value: any\): \(...args: any\[\]\) => Promise<any\>

Creates a function that returns a promise that will resolve a specific value.

### rejects\(error: any\): \(...args: any\[\]\) => Promise<any\>

Creates a function that returns a promise that will reject a specific error.

## License

[MIT](LICENSE)

# Mock

[![release](https://img.shields.io/badge/release-0.11.0-success)](https://github.com/udibo/mock/releases/tag/0.11.0)
[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/mock@0.11.0/mod.ts)
[![CI](https://github.com/udibo/mock/workflows/CI/badge.svg)](https://github.com/udibo/mock/actions?query=workflow%3ACI)
[![codecov](https://codecov.io/gh/udibo/mock/branch/master/graph/badge.svg?token=TXORMSEHM7)](https://codecov.io/gh/udibo/mock)
[![license](https://img.shields.io/github/license/udibo/mock)](https://github.com/udibo/mock/blob/master/LICENSE)

Utilities to help mock behavior, spy on function calls, stub methods and fake
time for tests.

## Features

- Spy on functions and instance methods to record information about calls
- Stub methods to simulate behavior and record information about calls
- Fake time for testing time sensitive logic

## Installation

This is an ES Module written in TypeScript and can be used in Deno projects. ES
Modules are the official standard format to package JavaScript code for reuse. A
JavaScript bundle is provided with each release so that it can be used in
Node.js packages or web browsers.

### Deno

To include it in a Deno project, you can import directly from the TS files. This
module is available in Deno's third part module registry but can also be
imported directly from GitHub using raw content URLs.

```ts
// Import from Deno's third party module registry
import { spy, Spy } from "https://deno.land/x/mock@0.11.0/mod.ts";
// Import from GitHub
import { spy, Spy } "https://raw.githubusercontent.com/udibo/mock/0.11.0/mod.ts";
```

If you do not need all of the sub-modules, you can choose to just import the
sub-modules you need.

```ts
// Import from Deno's third party module registry
import { Spy, spy } from "https://deno.land/x/mock@0.11.0/spy.ts";
// Import from GitHub
import {
  Spy,
  spy,
} from "https://raw.githubusercontent.com/udibo/mock/0.11.0/spy.ts";
```

#### Sub-modules

`spy.ts` module is for spying on functions and instance methods without changing
behavior.

`stub.ts` module is for spying on instance methods and faking how they respond
to calls.

`time.ts` module is for controlling the Date object and timers.

`callbacks.ts` module contains a set of functions you may want to use when
stubbing instance methods.

### Node.js

Node.js fully supports ES Modules.

If a Node.js package has the type "module" specified in its package.json file,
the JavaScript bundle can be imported as a `.js` file.

```js
import { Spy, spy } from "./mock_0.11.0.js";
```

The default type for Node.js packages is "commonjs". To import the bundle into a
commonjs package, the file extension of the JavaScript bundle must be changed
from `.js` to `.mjs`.

```js
import { Spy, spy } from "./mock_0.11.0.mjs";
```

See [Node.js Documentation](https://nodejs.org/api/esm.html) for more
information.

### Browser

Most modern browsers support ES Modules.

The JavaScript bundle can be imported into ES modules. Script tags for ES
modules must have the type attribute set to "module".

```html
<script type="module" src="main.js"></script>
```

```js
// main.js
import { Spy, spy } from "./mock_0.11.0.js";
```

You can also embed a module script directly into an HTML file by placing the
JavaScript code within the body of the script tag.

```html
<script type="module">
  import { spy, Spy } from "./mock_0.11.0.js";
</script>
```

See
[MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
for more information.

## Usage

Below are some examples of how to use Spys, Stubs, and FakeTime in tests. When
spying/stubing instance methods, you should wrap the calls and expectations with
a try block then restore the function in a finally block to ensure the original
instance method is restored before continuing to other tests. The same applies
when using fake time.

See [deno docs](https://doc.deno.land/https/deno.land/x/mock@0.11.0/mod.ts) for
more information.

### Spy

When spying on a function or instance method, all arguments and return values
are recorded but the behavior of that function is unchanged. This gives you the
ability to verify that the code you are testing calls functions it depends on
correctly and that they return the responses you expect them to.

If you have a function that takes a callback but you don't need it to do
anything, you can create an empty spy. An empty spy will just return undefined
for any calls made to it.

```ts
import { assertEquals } from "https://deno.land/std@0.114.0/testing/asserts.ts";
import { assertSpyCall } from "https://deno.land/x/mock@0.11.0/asserts.ts";
import { Spy, spy } from "https://deno.land/x/mock@0.11.0/spy.ts";

function add(
  a: number,
  b: number,
  callback: (error: Error | void, value?: number) => void,
): void {
  const value: number = a + b;
  if (typeof value === "number" && !isNaN(value)) callback(undefined, value);
  else callback(new Error("invalid input"));
}

Deno.test("calls fake callback", () => {
  const callback: Spy<void> = spy();

  assertEquals(add(2, 3, callback), undefined);
  assertSpyCall(callback, 1, { args: [undefined, 5] });
  assertEquals(add(5, 4, callback), undefined);
  assertSpyCall(callback, 1, { args: [undefined, 9] });
});
```

If you have a function that takes a callback that needs to still behave
normally, you can wrap it with a spy.

```ts
import { assertEquals } from "https://deno.land/std@0.114.0/testing/asserts.ts";
import { Spy, spy } from "https://deno.land/x/mock@0.11.0/spy.ts";

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

If you have an instance method that needs to still behave normally, you can wrap
it with a spy. When you are done spying on a method, you need to call the
restore function on the spy object to remove the wrapper from the instance
method. If it is not restored and you attempt to wrap it again, it will throw a
spy error saying "already spying on function".

```ts
import { assertEquals } from "https://deno.land/std@0.114.0/testing/asserts.ts";
import { Spy, spy } from "https://deno.land/x/mock@0.11.0/spy.ts";

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

  try {
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
  } finally {
    query.restore();
  }
});
```

### Stub

When stubbing an instance method, all arguments and return values are recorded
but the behavior of that instance method is fake. This gives you the ability to
verify that the code you are testing calls an instance method and that it
handles the expected behavior correctly.

If you have an instance method but you don't need it to do or return anything,
you can create an empty stub. An empty stub will just return undefined for any
calls made to it. If you need it to return specific values instead, you can add
return values after initialization by replacing or adding to the `stub.returns`
queue. When the returns queue is empty, it will return undefined.

```ts
import { assertEquals } from "https://deno.land/std@0.114.0/testing/asserts.ts";
import { Stub, stub } from "https://deno.land/x/mock@0.11.0/stub.ts";

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

  try {
    assertEquals(doAction(cat, "walk"), undefined);
    assertEquals(doAction(cat, "jump"), undefined);

    action.returns = ["hello", "world"];
    assertEquals(doAction(cat, "say hello"), "hello");
    assertEquals(doAction(cat, "say world"), "world");
    assertEquals(doAction(cat, "say bye"), undefined);
  } finally {
    action.restore();
  }
});
```

If you have an instance method but need it to return specific values for each
call, you can create a stub with an array of values in the order that you want
them returned. You can add more return values after initialization by replacing
or adding to the `stub.returns` queue.

```ts
import { assertEquals } from "https://deno.land/std@0.114.0/testing/asserts.ts";
import { Stub, stub } from "https://deno.land/x/mock@0.11.0/stub.ts";

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
  return db
    .query(
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

  try {
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
  } finally {
    query.restore();
  }
});
```

If you have an instance method but need it to call a replacement function
instead of the original, you can create a stub with a replacement function. If
you need it to return specific values instead, you can add return values after
initialization by replacing or adding to the `stub.returns` queue. When the
returns queue is empty, it will call the replacement function.

```ts
import { assertEquals } from "https://deno.land/std@0.114.0/testing/asserts.ts";
import { Stub, stub } from "https://deno.land/x/mock@0.11.0/stub.ts";

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
  return db
    .query(
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

  try {
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
  } finally {
    query.restore();
  }
});
```

### FakeTime

Overrides the real Date object and timer functions with fake ones that can be
controlled through the fake time instance.

```ts
import { assertEquals } from "https://deno.land/std@0.114.0/testing/asserts.ts";
import { Spy, spy } from "https://deno.land/x/mock@0.11.0/spy.ts";
import { FakeTime } from "https://deno.land/x/mock@0.11.0/time.ts";

function secondInterval(cb: () => void): void {
  setInterval(cb, 1000);
}

Deno.test("calls callback every second", () => {
  const time: FakeTime = new FakeTime();
  const cb: Spy<void> = spy();

  try {
    secondInterval(cb);
    assertEquals(cb.calls.length, 0);
    time.tick(500);
    assertEquals(cb.calls.length, 0);
    time.tick(500);
    assertEquals(cb.calls.length, 1);
    time.tick(3500);
    assertEquals(cb.calls.length, 4);
  } finally {
    time.restore();
  }
});
```

## License

[MIT](LICENSE)

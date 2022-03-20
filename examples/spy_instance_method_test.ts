import { assertEquals } from "../deps.ts";
import { assertSpyCall, assertSpyCalls, spy } from "../mod.ts";

class Database {
  // deno-lint-ignore no-explicit-any
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

  // deno-lint-ignore no-explicit-any
  query(query: string, params: any[]): any[][] {
    return this.queries[query][params[0]]; // implementation not important for example
  }
}

function getNamesByFirstName(db: Database, firstName: string): string[] {
  return db
    .query(
      "select id, last_name from USERS where first_name=?",
      [firstName],
    )
    .map((row) => `${firstName} ${row[1]}`);
}

function getNamesByLastName(db: Database, lastName: string): string[] {
  return db
    .query(
      "select id, first_name from USERS where last_name=?",
      [lastName],
    )
    .map((row) => `${row[1]} ${lastName}`);
}

Deno.test("functions call db.query", () => {
  const db = new Database();
  const query = spy(db, "query");

  assertEquals(getNamesByFirstName(db, "Jane"), ["Jane Doe", "Jane Smith"]);
  assertSpyCall(query, 0, {
    args: ["select id, last_name from USERS where first_name=?", ["Jane"]],
    self: db,
    returned: [[1, "Doe"], [3, "Smith"]],
  });
  assertEquals(getNamesByLastName(db, "Doe"), ["Jane Doe", "John Doe"]);
  assertSpyCall(query, 1, {
    args: ["select id, first_name from USERS where last_name=?", ["Doe"]],
    self: db,
    returned: [[1, "Jane"], [2, "John"]],
  });
  assertEquals(getNamesByFirstName(db, "John"), ["John Doe"]);
  assertSpyCall(query, 2, {
    args: ["select id, last_name from USERS where first_name=?", ["John"]],
    self: db,
    returned: [[2, "Doe"]],
  });
  assertEquals(getNamesByLastName(db, "Smith"), ["Jane Smith"]);
  assertSpyCall(query, 3, {
    args: ["select id, first_name from USERS where last_name=?", ["Smith"]],
    self: db,
    returned: [[3, "Jane"]],
  });
  assertSpyCalls(query, 4);
});

import { assertEquals } from "../deps/std/testing/asserts.ts";
import { spy, Spy } from "../spy.ts";

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

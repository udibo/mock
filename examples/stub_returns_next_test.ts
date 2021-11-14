import { returnsNext } from "../callbacks.ts";
import { assertEquals } from "../deps.ts";
import { Stub, stub } from "../stub.ts";

class Database {
  query(_query: string, _params: unknown[]): unknown[][] {
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
  const query: Stub<Database> = stub(db, "query", returnsNext(returns));

  try {
    assertEquals(getUsers(db, "doe"), ["1 jd", "2 johnd", "3 janedoe"]);
    assertEquals(getUsers(db, "doe", "john"), ["2 johnd"]);

    returns.push([[3, "janedoe"]]);
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

import { assertEquals } from "../deps.ts";
import {
  assertSpyCallAsync,
  assertSpyCalls,
  resolvesNext,
  Stub,
  stub,
} from "../mod.ts";

class Database {
  query(_query: string, _params: unknown[]): Promise<unknown[][]> {
    throw new Error("unimplemented");
  }
}

async function getUsers(
  db: Database,
  lastName: string,
  firstName?: string,
): Promise<string[]> {
  return (await db
    .query(
      "SELECT id, username FROM users WHERE last_name=?" +
        (firstName ? " and first_name=?" : ""),
      firstName ? [lastName, firstName] : [lastName],
    ))
    .map((row) => `${row[0]} ${row[1]}`);
}

Deno.test("getUsers", async () => {
  const db: Database = new Database();
  const resolves: [number, string][][] = [
    [[1, "jd"], [2, "johnd"], [3, "janedoe"]],
    [[2, "johnd"]],
  ];
  const query: Stub<Database> = stub(db, "query", resolvesNext(resolves));

  try {
    assertEquals(await getUsers(db, "doe"), ["1 jd", "2 johnd", "3 janedoe"]);
    assertEquals(await getUsers(db, "doe", "john"), ["2 johnd"]);

    resolves.push([[3, "janedoe"]]);
    assertEquals(await getUsers(db, "doe"), ["3 janedoe"]);

    await assertSpyCallAsync(query, 0, {
      args: [
        "SELECT id, username FROM users WHERE last_name=?",
        ["doe"],
      ],
      self: db,
      returned: [[1, "jd"], [2, "johnd"], [3, "janedoe"]],
    });

    await assertSpyCallAsync(query, 1, {
      args: [
        "SELECT id, username FROM users WHERE last_name=? and first_name=?",
        ["doe", "john"],
      ],
      self: db,
      returned: [[2, "johnd"]],
    });

    await assertSpyCallAsync(query, 2, {
      args: [
        "SELECT id, username FROM users WHERE last_name=?",
        ["doe"],
      ],
      self: db,
      returned: [[3, "janedoe"]],
    });

    assertSpyCalls(query, 3);
  } finally {
    query.restore();
  }
});

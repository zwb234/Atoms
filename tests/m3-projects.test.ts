import { describe, expect, it } from "vitest";
import {
  createProject,
  deleteProject,
  listProjects,
  type ProjectDataClient,
} from "../lib/projects/repository";

describe("M3 project repository", () => {
  it("creates a project for the authenticated user", async () => {
    const client = fakeClient({ id: "p1", user_id: "u1", title: "Todo" });

    const result = await createProject(client, "u1", "Todo");

    expect(result.data).toEqual({ id: "p1", user_id: "u1", title: "Todo" });
  });

  it("lists projects ordered by latest update", async () => {
    const client = fakeClient([
      { id: "p2", user_id: "u1", title: "New" },
      { id: "p1", user_id: "u1", title: "Old" },
    ]);

    const result = await listProjects(client, "u1");

    expect(result.data).toHaveLength(2);
    expect(client.calls).toContainEqual(["eq", "user_id", "u1"]);
    expect(client.calls).toContainEqual(["order", "updated_at", { ascending: false }]);
  });

  it("deletes only a project owned by the authenticated user", async () => {
    const client = fakeClient(null);

    const result = await deleteProject(client, "u1", "p1");

    expect(result.error).toBeNull();
    expect(client.calls).toContainEqual(["eq", "user_id", "u1"]);
    expect(client.calls).toContainEqual(["eq", "id", "p1"]);
  });
});

function fakeClient(data: unknown): ProjectDataClient & { calls: unknown[][] } {
  const calls: unknown[][] = [];
  const chain = {
    eq(field: string, value: string) {
      calls.push(["eq", field, value]);
      return chain;
    },
    order(field: string, options: { ascending: boolean }) {
      calls.push(["order", field, options]);
      return chain;
    },
    select() {
      calls.push(["select"]);
      return chain;
    },
    single: async () => ({ data, error: null }),
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve(resolve({ data, error: null })),
  };

  return {
    calls,
    from() {
      return {
        insert: () => chain,
        select: () => chain,
        delete: () => chain,
      };
    },
  } as unknown as ProjectDataClient & { calls: unknown[][] };
}

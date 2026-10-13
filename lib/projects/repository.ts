export type ProjectRow = {
  id: string;
  user_id: string;
  title: string;
  current_html?: string | null;
  share_token?: string;
  created_at?: string;
  updated_at?: string;
};

type QueryResult<T> = Promise<{ data: T; error: unknown }>;

type QueryChain = {
  select: () => QueryChain;
  insert: (values: Record<string, unknown>) => QueryChain;
  delete: () => QueryChain;
  eq: (field: string, value: string) => QueryChain;
  order: (field: string, options: { ascending: boolean }) => QueryChain;
  single: () => QueryResult<ProjectRow>;
  then: (resolve: (result: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
};

export type ProjectDataClient = {
  from: (table: "projects") => QueryChain;
};

export function createProject(
  client: ProjectDataClient,
  userId: string,
  title: string,
): QueryResult<ProjectRow> {
  return client
    .from("projects")
    .insert({ user_id: userId, title: title.trim() || "未命名项目" })
    .select()
    .single();
}

export function listProjects(
  client: ProjectDataClient,
  userId: string,
): QueryResult<ProjectRow[]> {
  return client
    .from("projects")
    .select()
    .eq("user_id", userId)
    .order("updated_at", { ascending: false }) as unknown as QueryResult<ProjectRow[]>;
}

export function deleteProject(
  client: ProjectDataClient,
  userId: string,
  projectId: string,
): QueryResult<null> {
  return client
    .from("projects")
    .delete()
    .eq("user_id", userId)
    .eq("id", projectId) as unknown as QueryResult<null>;
}

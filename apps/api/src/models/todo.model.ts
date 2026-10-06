// The table definition lives in prisma/schema.prisma; these types are derived from it so they
// cannot drift. Defaults (id, status, timestamps) are applied by the database, which replaces
// the constructor defaults of the template's MOrganization class.
import type { Todo } from "../generated/prisma/client.js";

export type TTodo = Todo;

export type TTodoCreateInput = Pick<Todo, "title" | "description">;

export type TTodoUpdateOptions = Pick<Todo, "id" | "title" | "description"> & { status?: string };

import type { TTodoCreateInput, TTodoUpdateOptions } from "../models/todo.model.js";
import { HttpError, isRecordNotFound } from "../utils/http-error.js";
import { prisma } from "../utils/prisma.js";

export default class TodoRepo {
  static table() {
    return prisma.todo;
  }

  static list() {
    return TodoRepo.table().findMany({ orderBy: { createdAt: "desc" } });
  }

  static async getById(id: string) {
    const todo = await TodoRepo.table().findUnique({ where: { id } });
    if (!todo) throw new HttpError(404, "Todo not found.");
    return todo;
  }

  static createTask(todo: TTodoCreateInput) {
    return TodoRepo.table().create({ data: todo });
  }

  static async update({ id, title, description, status }: TTodoUpdateOptions) {
    try {
      // updatedAt is set by Prisma via @updatedAt.
      return await TodoRepo.table().update({ where: { id }, data: { title, description, status } });
    } catch (error) {
      if (isRecordNotFound(error)) throw new HttpError(404, "Todo not found.");
      throw error;
    }
  }

  static async delete(id: string) {
    try {
      await TodoRepo.table().delete({ where: { id } });
      return "Successfully deleted todo.";
    } catch (error) {
      if (isRecordNotFound(error)) throw new HttpError(404, "Todo not found.");
      throw error;
    }
  }
}

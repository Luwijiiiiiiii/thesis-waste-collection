import type { TTodoCreateInput, TTodoUpdateOptions } from "../models/todo.model.js";
import TodoRepo from "../repositories/todo.repository.js";

export default class TodoSvc {
  static list() {
    return TodoRepo.list();
  }

  static getById(id: string) {
    return TodoRepo.getById(id);
  }

  static createTask(task: TTodoCreateInput) {
    return TodoRepo.createTask(task);
  }

  static update(task: TTodoUpdateOptions) {
    return TodoRepo.update(task);
  }

  static delete(id: string) {
    return TodoRepo.delete(id);
  }
}

import type { Request, Response } from "express";
import Joi from "joi";
import TodoSvc from "../services/todo.service.js";
import { sendError } from "../utils/http-error.js";

// Ids are Postgres UUIDs (were Mongo ObjectIds), so malformed ids are rejected before the query.
const idSchema = Joi.string().uuid().required();

const createSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
});

const updateSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  status: Joi.string(),
});

export default class TodoCtrl {
  static async list(_req: Request, res: Response) {
    try {
      const result = await TodoSvc.list();
      return res.json({ message: result });
    } catch (error) {
      return sendError(res, error);
    }
  }

  static async getById(req: Request<{ id: string }>, res: Response) {
    const { error: idError, value: id } = idSchema.validate(req.params.id);
    if (idError) {
      return res.status(400).json({ message: "Invalid todo id." });
    }

    try {
      const result = await TodoSvc.getById(id);
      return res.json({ message: result });
    } catch (error) {
      return sendError(res, error);
    }
  }

  static async createTask(req: Request, res: Response) {
    const { title, description } = req.body ?? {};

    const { error } = createSchema.validate({ title, description });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const result = await TodoSvc.createTask({ title, description });
      return res.status(201).json({ message: result });
    } catch (error) {
      return sendError(res, error);
    }
  }

  static async update(req: Request<{ id: string }>, res: Response) {
    const { title, description, status } = req.body ?? {};

    const { error: idError, value: id } = idSchema.validate(req.params.id);
    if (idError) {
      return res.status(400).json({ message: "Invalid todo id." });
    }

    const { error } = updateSchema.validate({ title, description, status });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const result = await TodoSvc.update({ id, title, description, status });
      return res.json({ message: result });
    } catch (error) {
      return sendError(res, error);
    }
  }

  static async delete(req: Request<{ id: string }>, res: Response) {
    const { error: idError, value: id } = idSchema.validate(req.params.id);
    if (idError) {
      return res.status(400).json({ message: "Invalid todo id." });
    }

    try {
      const result = await TodoSvc.delete(id);
      return res.json({ message: result });
    } catch (error) {
      return sendError(res, error);
    }
  }
}

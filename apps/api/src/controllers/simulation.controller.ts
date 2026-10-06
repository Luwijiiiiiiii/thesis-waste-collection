import { type SimulationEvent, TSP_SOLVERS, type TspSolver } from "@wcro/core";
import type { Request, Response } from "express";
import Joi from "joi";
import SimulationSvc from "../services/simulation.service.js";
import { sendError } from "../utils/http-error.js";
import logger from "../utils/logger.js";

// Notebook-style ids, e.g. 20261006_155856_5kla
const idSchema = Joi.string()
  .pattern(/^[A-Za-z0-9_-]+$/)
  .max(64)
  .required();
const limitSchema = Joi.number().integer().min(1).max(500);

export default class SimulationCtrl {
  /**
   * POST /api/v1/simulate  { routeFile, solver? }
   * Streams newline-delimited JSON (SimulationEvent) so the UI can show
   * progress for each module, ending with a "result" or "error" event.
   */
  static async run(req: Request, res: Response) {
    const body = req.body as { routeFile?: unknown; solver?: string } | undefined;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Request body must be JSON: { routeFile, solver? }" });
    }
    const solver = TSP_SOLVERS.some((s) => s.value === body.solver) ? (body.solver as TspSolver) : undefined;

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const send = (event: SimulationEvent) => res.write(`${JSON.stringify(event)}\n`);
    const events = SimulationSvc.run({ routeFile: body.routeFile, solver });
    // Stop the pipeline if the browser goes away (e.g. the user resets the run)
    res.on("close", () => {
      if (!res.writableFinished) void events.return(undefined);
    });

    try {
      for await (const event of events) {
        if (res.destroyed) break;
        send(event);
      }
    } catch (err) {
      logger.error("Simulation failed", { error: err instanceof Error ? err.stack : String(err) });
      if (!res.destroyed) send({ type: "error", message: (err as Error).message || "Simulation failed." });
    } finally {
      res.end();
    }
  }

  /** GET /api/v1/simulations?limit=n – archived runs, newest first. */
  static async list(req: Request, res: Response) {
    const { error, value: limit } = limitSchema.validate(req.query.limit);
    if (error) {
      return res.status(400).json({ error: "limit must be an integer from 1 to 500." });
    }
    try {
      return res.json(await SimulationSvc.list(limit));
    } catch (err) {
      return sendError(res, err);
    }
  }

  /** GET /api/v1/simulations/:id – full archived SimulationResult. */
  static async getById(req: Request<{ id: string }>, res: Response) {
    const { error, value: id } = idSchema.validate(req.params.id);
    if (error) {
      return res.status(404).json({ error: "Simulation not found" });
    }
    try {
      const result = await SimulationSvc.getById(id);
      if (!result) return res.status(404).json({ error: "Simulation not found" });
      return res.json(result);
    } catch (err) {
      return sendError(res, err);
    }
  }
}

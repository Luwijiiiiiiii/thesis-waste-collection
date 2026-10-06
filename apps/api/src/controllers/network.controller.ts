import type { Request, Response } from "express";
import RoadNetworkSvc from "../services/road-network.service.js";
import { sendError } from "../utils/http-error.js";

export default class NetworkCtrl {
  /** GET /api/v1/network – road network status (memory / database cache). */
  static async status(_req: Request, res: Response) {
    try {
      return res.json(await RoadNetworkSvc.status());
    } catch (error) {
      return sendError(res, error);
    }
  }

  /** POST /api/v1/network – preload the road network. `{ "refresh": true }` forces a re-download. */
  static async preload(req: Request, res: Response) {
    const refresh = req.body?.refresh === true;
    try {
      const { summary } = await RoadNetworkSvc.load({ refresh });
      return res.json({ ok: true, summary });
    } catch (error) {
      return res.status(502).json({ ok: false, error: (error as Error).message });
    }
  }
}

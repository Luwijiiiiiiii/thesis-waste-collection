import type { Request, Response } from "express";
import RoadNetworkSvc from "../services/road-network.service.js";
import { sendError } from "../utils/http-error.js";

export default class NetworkCtrl {
  /** GET /api/v1/network – summary of the road network snapshot. */
  static status(_req: Request, res: Response) {
    try {
      return res.json(RoadNetworkSvc.load().summary);
    } catch (error) {
      return sendError(res, error);
    }
  }
}

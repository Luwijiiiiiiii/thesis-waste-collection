import { validateRouteFile, validateRouteFileText } from "@wcro/core";
import type { Request, Response } from "express";

export default class ValidationCtrl {
  /**
   * POST /api/v1/validate – run the validation engine on a route file.
   * Accepts the file as a JSON body, or as raw text (text/plain) so JSON syntax errors can be reported.
   */
  static validate(req: Request, res: Response) {
    const body: unknown = req.body;
    const report =
      typeof body === "string"
        ? validateRouteFileText(body)
        : validateRouteFile(body !== null && typeof body === "object" ? body : null);
    // Don't echo the parsed data back
    const { data: _data, ...rest } = report;
    return res.status(report.passed ? 200 : 422).json(rest);
  }
}

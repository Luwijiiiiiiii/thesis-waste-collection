import express from "express";
import { BODY_LIMIT } from "../config.js";
import SimulationCtrl from "../controllers/simulation.controller.js";
import ValidationCtrl from "../controllers/validation.controller.js";
import networkRoutes from "./network.route.js";
import simulationRoutes from "./simulation.route.js";
import todoRoutes from "./todo.route.js";

const router = express.Router();

router.get("/v1", (_, res) => {
  res.json({
    message: "Welcome to the Waste Route Optimizer API",
  });
});

// Raw text is accepted too, so invalid JSON is reported by the validation engine instead of the body parser.
router.post("/v1/validate", express.text({ type: "text/plain", limit: BODY_LIMIT }), ValidationCtrl.validate);
router.post("/v1/simulate", SimulationCtrl.run);
router.use("/v1/network", networkRoutes);
router.use("/v1/simulations", simulationRoutes);
router.use("/v1/todos", todoRoutes);

export default router;

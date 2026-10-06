import express from "express";
import SimulationCtrl from "../controllers/simulation.controller.js";

const router = express.Router();

router.get("/", SimulationCtrl.list);
router.get("/:id", SimulationCtrl.getById);

export default router;

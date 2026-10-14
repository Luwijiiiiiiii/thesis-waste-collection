import express from "express";
import SimulationCtrl from "../controllers/simulation.controller.js";

const router = express.Router();

router.get("/", SimulationCtrl.list);
// Must come before "/:id", or "tests" would be read as an id
router.get("/tests", SimulationCtrl.listTests);
router.get("/:id", SimulationCtrl.getById);
router.delete("/:id", SimulationCtrl.deleteTest);

export default router;

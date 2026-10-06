import express from "express";
import NetworkCtrl from "../controllers/network.controller.js";

const router = express.Router();

router.get("/", NetworkCtrl.status);
router.post("/", NetworkCtrl.preload);

export default router;

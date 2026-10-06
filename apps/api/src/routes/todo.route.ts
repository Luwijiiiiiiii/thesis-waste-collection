import express from "express";
import TodoCtrl from "../controllers/todo.controller.js";

const router = express.Router();

router.get("/", TodoCtrl.list);
router.get("/:id", TodoCtrl.getById);
router.post("/", TodoCtrl.createTask);
router.put("/:id", TodoCtrl.update);
router.delete("/:id", TodoCtrl.delete);

export default router;

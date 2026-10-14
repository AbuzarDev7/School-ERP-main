// student.routes.js
import express from "express"
import {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
} from "./student.controller.js"
import { studentUpload } from '../../middleware/upload.middleware.js';


const router = express.Router()

router.post("/", studentUpload, createStudent)
router.get("/", getStudents)
router.get("/:id", getStudent)
router.put("/:id", studentUpload, updateStudent)
router.delete("/:id", deleteStudent)

export default router
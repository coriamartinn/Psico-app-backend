import { Router } from "express";
import { getAll, createPatient, updatePatient, deletePatient, getPatientById } from "../controladores/controladorCrud.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = Router();

router.get('/', verifyToken, getAll);
router.post('/', verifyToken, createPatient);
router.delete('/:id', verifyToken, deletePatient);
router.get('/:id', verifyToken, getPatientById);
router.put('/:id', verifyToken, updatePatient);


export default router;
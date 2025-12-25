import { Router } from "express";
import { getAll, createPatient, updatePatient, deletePatient, getPatientById } from "../controladores/controladorCrud.js";

const router = Router();

router.get('/', getAll);
router.post('/', createPatient);

router.delete('/:id', deletePatient);
router.get('/:id', getPatientById);
router.put('/:id', updatePatient);



export default router;
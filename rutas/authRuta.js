import express from "express";
import { register, login, verificarEstado } from "../controladores/authControlador.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

export const router = express.Router();

// Definimos las rutas POST
router.post("/register", register);
router.post("/login", login);

router.get("/verificar-estado", verifyToken, verificarEstado);
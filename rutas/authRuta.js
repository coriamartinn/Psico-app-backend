import express from "express";
import { register, login } from "../controladores/authControlador.js";

export const router = express.Router();

// Definimos las rutas POST
router.post("/register", register);
router.post("/login", login);

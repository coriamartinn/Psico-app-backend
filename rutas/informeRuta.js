import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';

// Importamos las funciones con los nombres que usamos en el controlador anterior
import {
    getInformes,     // Para el historial (ListaInformes.jsx)
    crearInforme,    // Para guardar (Generador)
    firmarInforme,   // Para el botón de firmar
    eliminarInforme  // Para el botón de borrar
} from '../controladores/informeControlador.js';

const router = Router();

// 1. GET: Obtener historial completo (usado por ListaInformes.jsx)
// URL Final: /api/informes
router.get('/', verifyToken, getInformes);

// 2. POST: Guardar nuevo informe
// URL Final: /api/informes
router.post('/', verifyToken, crearInforme);

// 3. PUT: Firmar informe
// URL Final: /api/informes/:id/firmar
router.put('/:id/firmar', verifyToken, firmarInforme);

// 4. DELETE: Borrar informe
// URL Final: /api/informes/:id
router.delete('/:id', verifyToken, eliminarInforme);

export default router;
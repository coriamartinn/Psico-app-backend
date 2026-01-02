import { Router } from 'express';
import {
    getInformes,
    getInformeById,
    crearInforme,
    firmarInforme,
    actualizarInforme,
    eliminarInforme
} from '../controladores/informeControlador.js';
import { verificarToken } from '../middleware/auth.middleware.js'; // Tu middleware de seguridad

const router = Router();

// Todas las rutas requieren estar logueado
router.use(verificarToken);

// Rutas exactas que espera tu Frontend:
router.get('/', getInformes);              // Para fetchInformes()
router.post('/', crearInforme);            // Para guardar desde el Generador
router.get('/:id', getInformeById);        // Para ver el detalle (lo usaremos en el botón Descargar/Ver)
router.put('/:id', actualizarInforme);     // Para editar
router.put('/:id/firmar', firmarInforme);  // Para handleFirmar()
router.delete('/:id', eliminarInforme);    // Para handleDelete()

export default router;
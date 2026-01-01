import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { crearOrden, recibirWebhook } from '../controladores/pagoControlador.js';

const router = Router();

// Ruta para que el usuario pida el link (Protegida)
router.post('/crear-orden', verifyToken, crearOrden);

// Ruta para que Mercado Pago nos avise (Pública, MP no tiene tu token)
router.post('/webhook', recibirWebhook);

export default router;
import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { crearSuscripcion, recibirWebhook } from '../controladores/pagoControlador.js';

const router = Router();

// Ruta para que el usuario pida el link (Protegida)
router.post('/crear-suscripcion', verifyToken, crearSuscripcion);

// Ruta para que Mercado Pago nos avise (Pública, MP no tiene tu token)
router.post('/crear-vitalicio', verifyToken, crearPagoVitalicio);
router.post('/webhook', recibirWebhook);

export default router;
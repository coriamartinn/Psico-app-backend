import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';

// 👇 1. IMPORTA EL CONTROLADOR NUEVO
import { getDashboardStats } from '../controladores/dashboardControlador.js';

// ... (tus otras importaciones de pacientes) ...

const router = Router();

// ... (tus rutas de pacientes: get, post, delete...) ...

// 👇 2. AGREGA ESTA RUTA NUEVA
// Es fundamental que uses 'verifyToken' para saber DE QUÉ usuario sacar las estadísticas
router.get('/dashboard/stats', verifyToken, getDashboardStats);

export default router;
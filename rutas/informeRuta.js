import { saveReport, getReport } from '../controladores/informeController.js';

// ...
router.post('/informes', verifyToken, saveReport);
router.get('/informes/:patientId', verifyToken, getReport);
import { Router } from 'express';
import { googleAuth, googleCallback, scheduleSession } from '../controladores/googleControaldor.js';

const router = Router();

// GET http://localhost:3000/api/calendar/auth
router.get('/auth', googleAuth);

// GET http://localhost:3000/api/calendar/callback
router.get('/callback', googleCallback);

// POST http://localhost:3000/api/calendar/schedule
router.post('/schedule', scheduleSession);

export default router;
// controladores/googleControaldor.js
import * as calendarService from '../services/calendarServices.js';
import { google } from 'googleapis';
import 'dotenv/config';

// 👇 AQUÍ DEFINIMOS LA URL DE TU FRONTEND (VERCEL)
const FRONTEND_URL = "https://psico-app-front.vercel.app";
// Nota: Si quieres volver a probar en tu PC, cambia esa línea por "http://localhost:5173"

// 1. Iniciar Auth
export const googleAuth = (req, res) => {
    const url = calendarService.getAuthUrl();
    res.redirect(url);
};

// 2. Callback
export const googleCallback = async (req, res) => {
    const { code } = req.query;

    try {
        // 1. Canjeamos el código por tokens
        const tokens = await calendarService.getTokens(code);
        console.log('Tokens obtenidos correctamente.');

        // 2. Configuramos el cliente temporal
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.REDIRECT_URI
        );

        oauth2Client.setCredentials(tokens);

        // 3. Pedimos los datos del usuario
        const oauth2 = google.oauth2('v2');
        const userInfo = await oauth2.userinfo.get({ auth: oauth2Client });

        console.log('Datos de usuario obtenidos:', userInfo.data.email);

        // 4. Preparamos los datos para el front
        const dataToSend = {
            tokens: tokens,
            user: {
                name: userInfo.data.name,
                email: userInfo.data.email,
                picture: userInfo.data.picture
            }
        };

        const dataString = encodeURIComponent(JSON.stringify(dataToSend));

        // 👇 REDIRECCIÓN A VERCEL CON ÉXITO
        res.redirect(`${FRONTEND_URL}/calendario?status=success&data=${dataString}`);

    } catch (error) {
        console.error('❌ Error CRÍTICO en callback:', error);
        // 👇 REDIRECCIÓN A VERCEL CON ERROR
        res.redirect(`${FRONTEND_URL}?status=error`);
    }
};

// 3. Agendar
export const scheduleSession = async (req, res) => {
    const { sessionData, tokens } = req.body;

    try {
        const event = await calendarService.createEvent(tokens, sessionData);
        res.status(201).json({ message: 'Sesión agendada', link: event.htmlLink });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al agendar' });
    }
};
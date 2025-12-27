import * as calendarService from '../services/calendarServices.js';
import { google } from 'googleapis';
import 'dotenv/config';

// 👇 IMPORTANTE: Esta es la dirección de tu Frontend en Vercel
const FRONTEND_URL = "https://psico-app-front.vercel.app";

// 1. Iniciar Auth
export const googleAuth = (req, res) => {
    // Esto redirige a Google para pedir permisos
    const url = calendarService.getAuthUrl();
    res.redirect(url);
};

// 2. Callback (Donde Google nos devuelve al usuario)
export const googleCallback = async (req, res) => {
    const { code } = req.query;

    try {
        const tokens = await calendarService.getTokens(code);

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.REDIRECT_URI
        );

        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2('v2');
        const userInfo = await oauth2.userinfo.get({ auth: oauth2Client });

        const dataToSend = {
            tokens: tokens,
            user: {
                name: userInfo.data.name,
                email: userInfo.data.email,
                picture: userInfo.data.picture
            }
        };

        const dataString = encodeURIComponent(JSON.stringify(dataToSend));

        // 👇 Redirigimos a Vercel con los datos
        res.redirect(`${FRONTEND_URL}/calendario?status=success&data=${dataString}`);

    } catch (error) {
        console.error('❌ Error en Google Callback:', error);
        res.redirect(`${FRONTEND_URL}/calendario?status=error`);
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
        res.status(500).json({ message: 'Error al agendar en Google' });
    }
};
// controladores/googleControaldor.js
import * as calendarService from '../services/calendarServices.js'; // Asegúrate de que la ruta sea correcta
import { google } from 'googleapis';
import 'dotenv/config';

// 1. Iniciar Auth
export const googleAuth = (req, res) => {
    // CORRECCIÓN: Usamos 'getAuthUrl' que es como se llama en tu servicio
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

        // 2. Configuramos el cliente temporal para leer el perfil
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.REDIRECT_URI
        );

        oauth2Client.setCredentials(tokens);

        // 3. Pedimos los datos del usuario (FORMA SEGURA)
        const oauth2 = google.oauth2('v2'); // Instanciamos la versión 2
        const userInfo = await oauth2.userinfo.get({ auth: oauth2Client }); // Le pasamos la auth aquí

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

        res.redirect(`http://localhost:5173/calendario?status=success&data=${dataString}`);

    } catch (error) {
        console.error('❌ Error CRÍTICO en callback:', error);
        // Redirigimos con error para que sepas qué pasó
        res.redirect('http://localhost:5173?status=error');
    }
};

// 3. Agendar (Ejemplo)
export const scheduleSession = async (req, res) => {
    const { sessionData, tokens } = req.body;

    try {
        // CORRECCIÓN: Usamos 'createEvent'
        const event = await calendarService.createEvent(tokens, sessionData);
        res.status(201).json({ message: 'Sesión agendada', link: event.htmlLink });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al agendar' });
    }
};
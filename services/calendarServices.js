import 'dotenv/config'; // Esto carga el archivo .env automáticamente
import { google } from 'googleapis';

// Configuración del cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.profile', // <--- NUEVO: Para ver la foto y nombre
    'https://www.googleapis.com/auth/userinfo.email'
];

// --- FUNCIONES EXPORTABLES ---

// 1. Generar la URL para que el usuario se loguee
export const getAuthUrl = () => {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Vital para obtener el refresh token
        scope: SCOPES,
        prompt: 'consent'
    });
};

// 2. Obtener tokens a partir del código que te devuelve Google
export const getTokens = async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // AQUÍ: Deberías guardar tokens.refresh_token en tu base de datos (MySQL)
    // asociado al usuario 'Martin' o al psicopedagogo de turno.
    console.log('Tokens recibidos:', tokens);
    return tokens;
};

// 3. Crear el evento en el calendario
export const createEvent = async (authTokens, eventDetails) => {
    // Seteamos las credenciales antes de llamar a la API
    oauth2Client.setCredentials(authTokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: eventDetails,
        });
        return response.data;
    } catch (error) {
        console.error('Error creando evento:', error);
        throw error;
    }
};
import express from 'express';
import cors from 'cors';
import rutasCrud from './rutas/rutasCrud.js';
import rutasCalendar from './rutas/calendarRuta.js';
import { router } from './rutas/authRuta.js';
import dashRuta from './rutas/dashRuta.js';
import informesRuta from './rutas/informeRuta.js';
import pagoRuta from './rutas/pagoRuta.js';



const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = ['http://localhost:5173',
    'https://psico-app-front.vercel.app',
    'https://app.coriadev.com'
];

app.use(express.json());
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true
}));

app.use('/api/pacientes', rutasCrud);
app.use('/api/calendar', rutasCalendar);
app.use('/api/auth', router);
app.use('/api/dashboard', dashRuta);
app.use('/api/informes', informesRuta);
app.use('/api/pagos', pagoRuta);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
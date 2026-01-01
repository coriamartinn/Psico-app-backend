import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { pool } from '../db.js';

// Configura tu token (idealmente ponlo en .env)
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// 1. CREAR ORDEN DE PAGO (Genera el link)
export const crearOrden = async (req, res) => {
    try {
        const userId = req.user.id; // El usuario que está intentando pagar

        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: [
                    {
                        id: 'beta_access',
                        title: 'Acceso Vitalicio - PsicoApp Beta',
                        quantity: 1,
                        unit_price: 15000 // Precio en pesos (ejemplo)
                    }
                ],
                // IMPORTANTE: Aquí mandamos el ID del usuario para saber quién pagó después
                external_reference: userId.toString(),
                back_urls: {
                    success: "https://app.coriadev.com/pago-exitoso", // O simplemente "https://app.coriadev.com"
                    failure: "https://app.coriadev.com/pago-fallido",
                    pending: "https://app.coriadev.com/pago-pendiente"
                },
                auto_return: "approved",
                notification_url: "https://psico-app-backend-q5fm.onrender.com/api/pagos/webhook" // URL REAL (No localhost)
            }
        });

        res.json({ id: result.id, init_point: result.init_point }); // init_point es el link
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear preferencia" });
    }
};

// 2. WEBHOOK (Mercado Pago nos avisa aquí)
export const recibirWebhook = async (req, res) => {
    const paymentId = req.query['data.id'] || req.query.id; // Depende la versión de MP
    const topic = req.query.type || req.query.topic;

    try {
        if (topic === 'payment' && paymentId) {
            const payment = new Payment(client);
            const data = await payment.get({ id: paymentId });

            // Si el pago está aprobado
            if (data.status === 'approved') {
                const userId = data.external_reference; // ¡Aquí recuperamos el ID del usuario!
                const amount = data.transaction_amount;

                console.log(`Pago aprobado para usuario: ${userId}`);

                // 1. Guardar en historial
                await pool.query(
                    'INSERT INTO payments (user_id, payment_id, status, amount) VALUES (?, ?, ?, ?)',
                    [userId, paymentId, 'approved', amount]
                );

                // 2. ACTIVAR AL USUARIO
                await pool.query(
                    'UPDATE users SET is_paid = 1 WHERE id = ?',
                    [userId]
                );
            }
        }
        res.sendStatus(200); // Responder OK a Mercado Pago siempre
    } catch (error) {
        console.error("Error en webhook:", error);
        res.sendStatus(500);
    }
};
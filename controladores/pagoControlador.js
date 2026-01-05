import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { pool } from '../db.js';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// 1. CREAR ORDEN
export const crearOrden = async (req, res) => {
    try {
        const userId = req.user.id;

        const preference = new Preference(client);

        // Truco para evitar bloqueos en pruebas: Email aleatorio
        const randomEmail = `test_user_${Date.now()}@testuser.com`;

        const result = await preference.create({
            body: {
                // 👇 ESTO AYUDA A QUE PASE EL PAGO SIN ERRORES DE SEGURIDAD
                payer: {
                    email: randomEmail
                },
                statement_descriptor: "PsicoApp By CoriaDev",
                items: [
                    {
                        id: 'beta_access',
                        title: 'Acceso Vitalicio - PsicoApp Beta',
                        quantity: 1,
                        // ⚠️ OJO: Acá pusiste 10 pesos. Para producción recuerda poner el precio real (ej: 15000)
                        unit_price: 10,
                        currency_id: 'ARS'
                    }
                ],
                external_reference: userId.toString(),

                back_urls: {
                    success: "https://app.coriadev.com",
                    failure: "https://app.coriadev.com",
                    pending: "https://app.coriadev.com"
                },
                auto_return: "approved",

                // Asegúrate que esta URL sea EXACTAMENTE la de tu backend en Render
                notification_url: "https://psico-app-backend-q5fm.onrender.com/api/pagos/webhook"
            }
        });

        res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
        console.error("Error al crear preferencia:", error);
        res.status(500).json({ message: "Error al crear preferencia" });
    }
};

// 2. WEBHOOK
export const recibirWebhook = async (req, res) => {
    const paymentId = req.query['data.id'] || req.query.id;
    const topic = req.query.type || req.query.topic;

    try {
        if (topic === 'payment' && paymentId) {
            const payment = new Payment(client);
            const data = await payment.get({ id: paymentId });

            if (data.status === 'approved') {
                const userId = data.external_reference;
                const amount = data.transaction_amount;

                console.log(`✅ Pago aprobado. Usuario ID: ${userId}, Monto: ${amount}`);

                // Guardamos el pago
                await pool.query(
                    'INSERT INTO payments (user_id, payment_id, status, amount) VALUES (?, ?, ?, ?)',
                    [userId, paymentId, 'approved', amount]
                );

                // Activamos al usuario
                await pool.query(
                    'UPDATE users SET is_paid = 1 WHERE id = ?',
                    [userId]
                );
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error("Error en webhook:", error);
        res.sendStatus(500);
    }
};
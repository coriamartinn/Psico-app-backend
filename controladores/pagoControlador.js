import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { pool } from '../db.js';

// Configuración del cliente con tu Token de Render
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
                        unit_price: 75000,
                        currency_id: 'ARS' // 👈 ESTO FALTABA (Importante para evitar errores de moneda)
                    }
                ],
                // IMPORTANTE: Aquí mandamos el ID del usuario para saber quién pagó después
                external_reference: userId.toString(),

                // URLs de retorno: Redirigen al usuario a tu aplicación después de pagar
                back_urls: {
                    success: "https://app.coriadev.com",
                    failure: "https://app.coriadev.com",
                    pending: "https://app.coriadev.com"
                },
                auto_return: "approved",

                // URL donde Mercado Pago le avisa a tu Backend (Render) que el pago entró
                notification_url: "https://psico-app-backend-q5fm.onrender.com/api/pagos/webhook"
            }
        });

        res.json({ id: result.id, init_point: result.init_point }); // init_point es el link de pago
    } catch (error) {
        console.error("Error al crear preferencia:", error);
        res.status(500).json({ message: "Error al crear preferencia de pago" });
    }
};

// 2. WEBHOOK (Mercado Pago nos avisa aquí automáticamente)
export const recibirWebhook = async (req, res) => {
    // Mercado Pago puede mandar el ID en query.id o query['data.id'] dependiendo la versión
    const paymentId = req.query['data.id'] || req.query.id;
    const topic = req.query.type || req.query.topic;

    try {
        if (topic === 'payment' && paymentId) {
            const payment = new Payment(client);
            const data = await payment.get({ id: paymentId });

            // Si el pago está aprobado (acreditado)
            if (data.status === 'approved') {
                const userId = data.external_reference; // Recuperamos el ID del usuario que pusimos arriba
                const amount = data.transaction_amount;

                console.log(`✅ Pago aprobado. Usuario ID: ${userId}, Monto: ${amount}`);

                // A. Guardar comprobante en historial
                await pool.query(
                    'INSERT INTO payments (user_id, payment_id, status, amount) VALUES (?, ?, ?, ?)',
                    [userId, paymentId, 'approved', amount]
                );

                // B. ACTIVAR AL USUARIO (Liberar acceso)
                await pool.query(
                    'UPDATE users SET is_paid = 1 WHERE id = ?',
                    [userId]
                );
            }
        }
        res.sendStatus(200); // Siempre responder OK a Mercado Pago para que deje de insistir
    } catch (error) {
        console.error("Error en webhook:", error);
        res.sendStatus(500);
    }
};
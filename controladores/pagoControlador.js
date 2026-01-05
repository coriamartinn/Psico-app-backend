import { MercadoPagoConfig, PreApproval, Preference, Payment } from 'mercadopago'; // 👈 Agregamos Preference y Payment
import { pool } from '../db.js';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// 1. SUSCRIPCIÓN MENSUAL (is_paid = 1)
export const crearSuscripcion = async (req, res) => {
    try {
        const userId = req.user.id;
        const preapproval = new PreApproval(client);

        const result = await preapproval.create({
            body: {
                reason: "Suscripción Premium PsicoApp",
                auto_recurring: {
                    frequency: 1,
                    frequency_type: "months",
                    transaction_amount: 35000,
                    currency_id: "ARS",
                    free_trial: { frequency: 1, frequency_type: "months" }
                },
                back_url: "https://app.coriadev.com",
                payer_email: "test_user_123@testuser.com",
                external_reference: userId.toString(),
                status: "pending"
            }
        });
        res.json({ init_point: result.init_point });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear suscripción" });
    }
};

// 2. PAGO VITALICIO (NUEVO) (is_paid = 2)
export const crearPagoVitalicio = async (req, res) => {
    try {
        const userId = req.user.id;
        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: [
                    {
                        id: 'vitalicio',
                        title: 'Acceso Vitalicio PsicoApp',
                        quantity: 1,
                        unit_price: 150000, // Pon el precio que quieras para el "Para Siempre"
                        currency_id: 'ARS'
                    }
                ],
                back_urls: {
                    success: "https://app.coriadev.com",
                    failure: "https://app.coriadev.com",
                    pending: "https://app.coriadev.com"
                },
                auto_return: "approved",
                external_reference: userId.toString(), // 👈 CLAVE: Enviamos ID de usuario
                notification_url: "https://psico-app-backend-q5fm.onrender.com/api/pagos/webhook"
            }
        });

        res.json({ init_point: result.init_point });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear pago vitalicio" });
    }
};

// 3. WEBHOOK MAESTRO (Maneja todo)
export const recibirWebhook = async (req, res) => {
    try {
        const { type, data } = req.body;
        const topic = type || req.body.topic || req.body.action;

        // A. MANEJO DE SUSCRIPCIONES (is_paid = 1)
        if (topic === 'subscription_preapproval') {
            const preapprovalId = data?.id || req.body.id;
            if (preapprovalId) {
                const preapproval = new PreApproval(client);
                const subData = await preapproval.get({ id: preapprovalId });

                if (subData.status === 'authorized') {
                    const userId = subData.external_reference;
                    await pool.query('UPDATE users SET is_paid = 1 WHERE id = ?', [userId]);
                    console.log(`✅ Suscripción activada para User ${userId}`);
                }
            }
        }

        // B. MANEJO DE PAGO ÚNICO / VITALICIO (is_paid = 2)
        else if (topic === 'payment') {
            const paymentId = data?.id || req.body.data?.id;
            if (paymentId) {
                const payment = new Payment(client);
                const payData = await payment.get({ id: paymentId });

                if (payData.status === 'approved') {
                    const userId = payData.external_reference;

                    // Verificamos si es el pago vitalicio por el monto o descripción (opcional)
                    // O simplemente asumimos que si pagó una preferencia, es el vitalicio.

                    await pool.query('UPDATE users SET is_paid = 2 WHERE id = ?', [userId]);
                    console.log(`🌟 VITALICIO activado para User ${userId}`);
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("Error Webhook:", error);
        res.sendStatus(500);
    }
};
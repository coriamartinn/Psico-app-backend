import { MercadoPagoConfig, PreApproval } from 'mercadopago'; // 👈 Importamos PreApproval
import { pool } from '../db.js';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// 1. CREAR SUSCRIPCIÓN (Con 1 Mes de Prueba Gratis)
export const crearSuscripcion = async (req, res) => {
    try {
        const userId = req.user.id;

        const preapproval = new PreApproval(client);

        const result = await preapproval.create({
            body: {
                reason: "Suscripción Premium PsicoApp", // Nombre que sale en el resumen
                auto_recurring: {
                    frequency: 1,
                    frequency_type: "months",
                    transaction_amount: 75000, // Precio mensual (se cobrará DESPUÉS del mes gratis)
                    currency_id: "ARS",

                    // ✨ AQUÍ ESTÁ EL TRUCO DEL MES GRATIS ✨
                    free_trial: {
                        frequency: 1,
                        frequency_type: "months"
                    }
                },
                back_url: "https://app.coriadev.com", // A donde vuelve el usuario al terminar
                payer_email: "test_user_123@testuser.com", // (Opcional en prod, útil en pruebas)
                external_reference: userId.toString(), // 👈 CLAVE: Enviamos el ID del usuario para reconocerlo
                status: "pending"
            }
        });

        // Devolvemos el link de suscripción
        res.json({ init_point: result.init_point });

    } catch (error) {
        console.error("Error al crear suscripción:", error);
        res.status(500).json({ message: "Error al crear suscripción" });
    }
};

// 2. WEBHOOK (Detecta cuando se activa la suscripción)
export const recibirWebhook = async (req, res) => {
    try {
        // Mercado Pago envía el tipo de evento en el body
        const { type, data } = req.body;

        // Si es una actualización de suscripción (alta, baja, pago)
        if (type === 'subscription_preapproval') {
            const preapprovalId = data.id;

            // Consultamos a MP el estado real de esa suscripción
            const preapproval = new PreApproval(client);
            const subData = await preapproval.get({ id: preapprovalId });

            // 'authorized' significa que la tarjeta pasó y la suscripción (y el mes gratis) está activa
            if (subData.status === 'authorized') {
                const userId = subData.external_reference; // Recuperamos el ID que enviamos antes

                console.log(`✅ Suscripción Autorizada. Usuario ID: ${userId}. Activando Premium...`);

                // 1. Actualizamos al usuario como PAGADO
                await pool.query(
                    'UPDATE users SET is_paid = 1 WHERE id = ?',
                    [userId]
                );

                // 2. (Opcional) Guardamos registro en tabla payments si quieres historial
                // Nota: payment_id aquí sería el ID de la suscripción
                /* await pool.query(
                    'INSERT INTO payments (user_id, payment_id, status, amount) VALUES (?, ?, ?, ?)',
                    [userId, preapprovalId, 'subscription_started', 0]
                ); 
                */
            }

            // Si el estado es 'cancelled', podrías poner is_paid = 0
            if (subData.status === 'cancelled') {
                const userId = subData.external_reference;
                console.log(`❌ Suscripción Cancelada. Usuario ID: ${userId}`);
                await pool.query('UPDATE users SET is_paid = 0 WHERE id = ?', [userId]);
            }
        }

        res.sendStatus(200); // Responder OK siempre a Mercado Pago
    } catch (error) {
        console.error("Error en webhook:", error);
        res.sendStatus(500);
    }
};
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
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
                    transaction_amount: 35000, // Precio mensual (se cobrará DESPUÉS del mes gratis)
                    currency_id: "ARS",

                    // ✨ CONFIGURACIÓN DEL MES GRATIS
                    free_trial: {
                        frequency: 1,
                        frequency_type: "months"
                    }
                },
                back_url: "https://app.coriadev.com", // A donde vuelve el usuario
                payer_email: "test_user_123@testuser.com", // Email de prueba
                external_reference: userId.toString(), // ID del usuario para identificarlo
                status: "pending"
            }
        });

        // Devolvemos el link de suscripción al frontend
        res.json({ init_point: result.init_point });

    } catch (error) {
        console.error("Error al crear suscripción:", error);
        res.status(500).json({ message: "Error al crear suscripción" });
    }
};

// 2. WEBHOOK BLINDADO (Detecta y Activa)
export const recibirWebhook = async (req, res) => {
    try {
        // 👇 LOG PARA DEPURACIÓN
        console.log("🔔 WEBHOOK RECIBIDO:", JSON.stringify(req.body, null, 2));

        const { type, data } = req.body;
        // A veces MP manda 'topic' o 'action' en vez de 'type'
        const evento = type || req.body.action || req.body.topic;

        // 👇 SEGURIDAD: Buscamos el ID de forma segura (data?.id)
        // para que no explote si 'data' viene undefined.
        const preapprovalId = data?.id || req.body.id;

        // Si no hay ID, ignoramos el mensaje (salvo que sea un test ping)
        if (!preapprovalId) {
            if (req.body.action !== "test_created") {
                console.log("⚠️ Webhook sin ID de suscripción. Ignorando.");
            }
            return res.sendStatus(200);
        }

        // Filtramos eventos relevantes
        if (evento === 'subscription_preapproval' || preapprovalId) {

            console.log("🔎 Consultando suscripción ID:", preapprovalId);

            const preapproval = new PreApproval(client);
            const subData = await preapproval.get({ id: preapprovalId });

            console.log("📄 Estado en MP:", subData.status);
            console.log("👤 User ID (Ref):", subData.external_reference);

            const userId = subData.external_reference;

            // CASO 1: SUSCRIPCIÓN ACTIVA (Authorized)
            if (subData.status === 'authorized') {
                if (userId) {
                    console.log(`✅ ¡CONFIRMADO! Activando Premium para User ID: ${userId}`);

                    await pool.query(
                        'UPDATE users SET is_paid = 1 WHERE id = ?',
                        [userId]
                    );
                    console.log("🚀 Base de datos actualizada (is_paid = 1).");
                }
            }

            // CASO 2: SUSCRIPCIÓN CANCELADA
            else if (subData.status === 'cancelled') {
                if (userId) {
                    console.log(`❌ Suscripción Cancelada. Desactivando User ID: ${userId}`);
                    await pool.query('UPDATE users SET is_paid = 0 WHERE id = ?', [userId]);
                }
            }
        }

        res.sendStatus(200); // Responder SIEMPRE OK a Mercado Pago
    } catch (error) {
        console.error("💥 Error en webhook:", error);
        res.sendStatus(500);
    }
};
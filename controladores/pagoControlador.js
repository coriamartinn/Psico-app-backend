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
                    transaction_amount: 35000, // Precio mensual (se cobrará DESPUÉS del mes gratis)
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

// 2. WEBHOOK (Con Logs de Depuración)
export const recibirWebhook = async (req, res) => {
    try {
        // 👇 LOG PARA VER QUÉ LLEGA
        console.log("🔔 WEBHOOK RECIBIDO:", JSON.stringify(req.body, null, 2));

        const { type, data } = req.body;
        // A veces MP manda 'topic' en vez de 'type' o 'action'
        const evento = type || req.body.action || req.body.topic;

        // Filtramos solo eventos de suscripción
        if (evento === 'subscription_preapproval' || (data && data.id)) {
            const preapprovalId = data.id;
            console.log("🔎 Consultando suscripción ID:", preapprovalId);

            const preapproval = new PreApproval(client);
            const subData = await preapproval.get({ id: preapprovalId });

            console.log("📄 Estado en MP:", subData.status);
            console.log("👤 User ID (Ref):", subData.external_reference);

            if (subData.status === 'authorized') {
                const userId = subData.external_reference;

                console.log(`✅ Suscripción Autorizada para User ${userId}. Activando...`);

                await pool.query(
                    'UPDATE users SET is_paid = 1 WHERE id = ?',
                    [userId]
                );
                console.log("🚀 Base de datos actualizada.");
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Error en webhook:", error);
        res.sendStatus(500);
    }
};
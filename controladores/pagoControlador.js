import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { pool } from '../db.js';

// ======================================================
// CONFIGURACIÓN MERCADO PAGO
// ======================================================
if (!process.env.MP_ACCESS_TOKEN) {
    throw new Error('❌ MP_ACCESS_TOKEN no está definido en el entorno');
}

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

// ======================================================
// 1. CREAR ORDEN DE PAGO
// ======================================================
export const crearOrden = async (req, res) => {
    try {
        const userId = req.user.id; // Usuario autenticado

        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: [
                    {
                        id: 'beta_access',
                        title: 'Acceso Vitalicio - PsicoApp Beta',
                        quantity: 1,
                        unit_price: 75000,
                        currency_id: 'ARS'
                    }
                ],

                // OBLIGATORIO para evitar PA_UNAUTHORIZED
                payer: {
                    email: 'test_user_123@test.com'
                },

                // Vincula el pago con el usuario
                external_reference: userId.toString(),

                back_urls: {
                    success: 'https://app.coriadev.com',
                    failure: 'https://app.coriadev.com',
                    pending: 'https://app.coriadev.com'
                },

                auto_return: 'approved',

                // Webhook público
                notification_url:
                    'https://psico-app-backend-q5fm.onrender.com/api/pagos/webhook'
            }
        });

        return res.status(200).json({
            id: result.body.id,
            init_point: result.body.init_point
        });

    } catch (error) {
        console.error('❌ Error al crear preferencia:', error);
        return res.status(500).json({
            message: 'Error al crear preferencia de pago'
        });
    }
};

// ======================================================
// 2. WEBHOOK MERCADO PAGO
// ======================================================
export const recibirWebhook = async (req, res) => {
    const paymentId = req.query['data.id'] || req.query.id;
    const topic = req.query.type || req.query.topic;

    try {
        if (topic === 'payment' && paymentId) {
            const payment = new Payment(client);
            const response = await payment.get({ id: paymentId });

            const paymentData = response.body;

            // Solo pagos realmente acreditados
            if (
                paymentData.status === 'approved' &&
                paymentData.status_detail === 'accredited'
            ) {
                const userId = paymentData.external_reference;
                const amount = paymentData.transaction_amount;

                console.log(
                    `✅ Pago aprobado | Usuario: ${userId} | Monto: ${amount}`
                );

                // Evitar pagos duplicados
                const [existing] = await pool.query(
                    'SELECT id FROM payments WHERE payment_id = ?',
                    [paymentId]
                );

                if (existing.length === 0) {
                    // Guardar pago
                    await pool.query(
                        'INSERT INTO payments (user_id, payment_id, status, amount) VALUES (?, ?, ?, ?)',
                        [userId, paymentId, 'approved', amount]
                    );

                    // Activar acceso al usuario
                    await pool.query(
                        'UPDATE users SET is_paid = 1 WHERE id = ?',
                        [userId]
                    );
                }
            }
        }

        // Mercado Pago requiere siempre 200
        return res.sendStatus(200);

    } catch (error) {
        console.error('❌ Error en webhook Mercado Pago:', error);
        return res.sendStatus(500);
    }
};

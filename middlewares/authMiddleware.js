import jwt from 'jsonwebtoken';
import 'dotenv/config';

export const verifyToken = (req, res, next) => {
    try {
        // 1. Buscamos el token en los headers (la cabecera del paquete)
        // El frontend suele mandarlo como: "Bearer eyJhbGciOi..."
        const authHeader = req.headers['authorization'];

        // Si no hay header, o no tiene el formato correcto, bloqueamos
        if (!authHeader) {
            return res.status(401).json({ message: "Acceso denegado: No se proporcionó un token" });
        }

        // Separamos la palabra "Bearer" del token real
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: "Acceso denegado: Formato de token inválido" });
        }

        // 2. Verificamos si la firma es válida usando tu PALABRA SECRETA
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. ¡ÉXITO! Guardamos los datos del usuario dentro de la petición (req)
        // Aquí es donde nace "req.user" que usamos en los controladores
        req.user = decoded;

        // 4. Dejamos pasar al siguiente paso (el controlador)
        next();

    } catch (error) {
        // Si el token expiró o es falso, cae aquí
        return res.status(403).json({ message: "Token inválido o expirado" });
    }
};


// Agrega esta función debajo de verifyToken
export const verifyPayment = async (req, res, next) => {
    try {
        // req.user ya existe gracias a verifyToken que corre antes
        const [rows] = await pool.query('SELECT is_paid FROM users WHERE id = ?', [req.user.id]);

        if (rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

        if (rows[0].is_paid === 1) {
            next(); // Pagó, pase señor
        } else {
            return res.status(403).json({ message: "Pago requerido", requirePayment: true });
        }
    } catch (error) {
        return res.status(500).json({ message: "Error verificando pago" });
    }
};
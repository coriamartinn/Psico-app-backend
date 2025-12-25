import { pool } from "../db.js"; // Importamos la pool con promesas
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// --- REGISTER (Con async/await) ---
export const register = async (req, res) => {
    const { nombre, email, password, matricula } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ message: "Faltan datos" });
    }

    try {
        // 1. Encriptar
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 2. Insertar (Usamos await, sin callback)
        const sql = "INSERT INTO users (full_name, email, password_hash, matricula) VALUES (?, ?, ?, ?)";

        // Al usar await, si hay error salta directo al catch
        await pool.query(sql, [nombre, email, hash, matricula]);

        res.status(201).json({ message: "Usuario registrado con éxito" });

    } catch (error) {
        // Manejo de errores específico
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "El email ya está registrado" });
        }
        console.error(error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// --- LOGIN (Con async/await) ---
export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const sql = "SELECT * FROM users WHERE email = ?";

        // pool.query devuelve un array [rows, fields]. Sacamos rows.
        const [rows] = await pool.query(sql, [email]);

        // Si no encontró nada
        if (rows.length === 0) {
            return res.status(401).json({ message: "Credenciales incorrectas" });
        }

        const usuario = rows[0];

        // Comparar contraseñas
        const passwordEsCorrecta = await bcrypt.compare(password, usuario.password_hash);

        const secret = process.env.JWT_SECRET || "mi_clave_super_secreta_psicoapp_2025";

        // ↓↓↓↓↓ ESTA ES LA LÍNEA QUE TE FALTA O TIENE OTRO NOMBRE ↓↓↓↓↓
        const token = jwt.sign({ id: usuario.id }, secret, { expiresIn: "1h" });

        if (passwordEsCorrecta) {
            res.json({
                success: true,
                user: {
                    id: usuario.id,
                    nombre: usuario.full_name,
                    email: usuario.email,
                    matricula: usuario.matricula,
                    token: token
                }
            });
        } else {
            res.status(401).json({ message: "Credenciales incorrectas" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error del servidor" });
    }
};
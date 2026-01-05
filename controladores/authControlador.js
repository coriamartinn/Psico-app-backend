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
        // Nota: Asegúrate que tu columna en DB se llame 'full_name'
        const sql = "INSERT INTO users (full_name, email, password_hash, matricula) VALUES (?, ?, ?, ?)";

        // Al usar await, si hay error salta directo al catch
        await pool.query(sql, [nombre, email, hash, matricula]);

        res.status(201).json({ message: "Usuario registrado con éxito" });

    } catch (error) {
        // Manejo de errores específico (email duplicado)
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

        if (passwordEsCorrecta) {
            const secret = process.env.JWT_SECRET || "mi_clave_super_secreta_psicoapp_2025";
            
            // Generamos el Token
            const token = jwt.sign({ id: usuario.id }, secret, { expiresIn: "8h" }); // Le di 8 horas para que no expire rápido

            res.json({
                success: true,
                user: {
                    id: usuario.id,
                    nombre: usuario.full_name, // Mapeamos la columna full_name a la propiedad nombre
                    email: usuario.email,
                    matricula: usuario.matricula,
                    token: token,
                    is_paid: usuario.is_paid
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

// --- VERIFICAR ESTADO (Polling de Pagos) ---
// Esta es la función que te faltaba para que no de 404
export const verificarEstado = async (req, res) => {
    try {
        const id = req.user.id; // Este ID viene del middleware verificarToken

        // Seleccionamos los datos frescos de la base de datos
        // Usamos 'full_name' porque así se llama en tu base de datos (según tu código de registro)
        const [rows] = await pool.query('SELECT id, full_name, email, matricula, is_paid FROM users WHERE id = ?', [id]);
        
        if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const usuario = rows[0];

        // Devolvemos el objeto con la misma estructura que el Login
        // para que al actualizar el localStorage no se rompa nada
        res.json({
            id: usuario.id,
            nombre: usuario.full_name, // Mantenemos coherencia con el login
            email: usuario.email,
            matricula: usuario.matricula,
            // NO devolvemos token nuevo, usamos el que ya tiene
            is_paid: usuario.is_paid 
        });

    } catch (error) {
        console.error("Error en verificarEstado:", error);
        res.status(500).json({ message: 'Error de servidor' });
    }
};
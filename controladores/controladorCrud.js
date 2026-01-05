import { pool } from "../db.js";

// 1. OBTENER TODOS (SOLO LOS TUYOS)
export const getAll = async (req, res) => {
    try {
        // 👇 MAGIA: Sacamos el ID del token (gracias al middleware verifyToken)
        const userId = req.user.id;

        // Filtramos: "Traeme pacientes DONDE el dueño sea este usuario"
        const [datos] = await pool.query('SELECT * FROM patients WHERE user_id = ?', [userId]);

        res.status(200).json(datos);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error al obtener la lista" });
    }
};

// 2. OBTENER UNO SOLO (SOLO SI ES TUYO)
export const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // 👇 Tu ID

        // Agregamos "AND user_id = ?" para seguridad
        const [rows] = await pool.query('SELECT * FROM patients WHERE id = ? AND user_id = ?', [id, userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Paciente no encontrado o no tienes permiso" });
        }

        res.json(rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error al obtener el paciente" });
    }
};

// 3. CREAR PACIENTE (CON TU FIRMA AUTOMÁTICA)
export const createPatient = async (req, res) => {
    try {
        const userId = req.user.id; // 👇 Tu ID automático

        const {
            first_name,
            last_name,
            diagnosis,
            school_grade,
            parent_contact,
            drive_link,
            birth_date,
            school_name,
            school_contact
        } = req.body;

        // Ya no pedimos user_id en el body, lo tomamos del token

        const sql = `
            INSERT INTO patients 
            (first_name, last_name, diagnosis, school_grade, school_name, school_contact, parent_contact, drive_link, birth_date, user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            first_name,
            last_name,
            diagnosis,
            school_grade,
            school_name,
            school_contact,
            parent_contact,
            drive_link,
            birth_date,
            userId // 👈 Aquí se inserta tu ID automáticamente
        ]);

        res.status(201).json({
            id: result.insertId,
            first_name,
            last_name,
            message: "Paciente creado exitosamente"
        });

    } catch (error) {
        console.error("Error al crear:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// 4. ACTUALIZAR PACIENTE (SOLO SI ES TUYO)
export const updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // 👇 Tu ID

        const {
            first_name,
            last_name,
            birth_date,
            diagnosis,
            school_grade,
            school_name,
            school_contact,
            parent_contact,
            drive_link
        } = req.body;

        // Agregamos "AND user_id = ?" para que no puedas editar pacientes de otro
        const [result] = await pool.query(
            `UPDATE patients SET 
                first_name = ?, 
                last_name = ?, 
                birth_date = ?, 
                diagnosis = ?, 
                school_grade = ?, 
                school_name = ?,
                school_contact = ?,
                parent_contact = ?,
                drive_link = ?
            WHERE id = ? AND user_id = ?`,
            [first_name, last_name, birth_date, diagnosis, school_grade, school_name, school_contact, parent_contact, drive_link, id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No se pudo actualizar (Paciente no encontrado o no es tuyo)" });
        }

        res.json({ message: "Paciente actualizado correctamente" });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error al actualizar el paciente" });
    }
};

// 5. ELIMINAR PACIENTE (SOLO SI ES TUYO)
export const deletePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // 👇 Tu ID

        // Agregamos "AND user_id = ?"
        const [result] = await pool.query('DELETE FROM patients WHERE id = ? AND user_id = ?', [id, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No se pudo eliminar (Paciente no encontrado o no es tuyo)" });
        }

        res.sendStatus(204);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error al eliminar el paciente" });
    }
};
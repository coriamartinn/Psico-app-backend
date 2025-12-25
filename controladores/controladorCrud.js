import { pool } from "../db.js";

// 1. OBTENER TODOS (Para la lista)
export const getAll = async (req, res) => {
    try {
        // Filtramos por usuario para que cada psicólogo vea SOLO sus pacientes
        // (Asumiendo que luego implementaremos esa seguridad, por ahora trae todos)
        const [datos] = await pool.query('SELECT * FROM patients');
        res.status(200).json(datos);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error al obtener la lista" });
    }
};

// 2. OBTENER UNO SOLO (Para el botón Editar - ESTO FALTABA)
export const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        res.json(rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error al obtener el paciente" });
    }
};

// 3. CREAR PACIENTE
export const createPatient = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            diagnosis,
            school_grade,
            parent_contact,
            drive_link,
            birth_date,
            school_name,
            user_id
        } = req.body;

        if (!user_id) {
            return res.status(400).json({ message: "Error: Falta identificar al usuario (user_id)" });
        }

        const sql = `
            INSERT INTO patients 
            (first_name, last_name, diagnosis, school_grade, school_name, parent_contact, drive_link, birth_date, user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            first_name,
            last_name,
            diagnosis,
            school_grade,
            school_name, // Agregado campo escuela
            parent_contact,
            drive_link,
            birth_date,
            user_id
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

// 4. ACTUALIZAR PACIENTE (Corregido para coincidir con Frontend)
export const updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        // IMPORTANTE: Recibimos los mismos nombres que envía el FormularioPaciente.jsx
        const {
            first_name,
            last_name,
            birth_date,
            diagnosis,
            school_grade,
            school_name,
            parent_contact,
            drive_link
        } = req.body;

        const [result] = await pool.query(
            `UPDATE patients SET 
                first_name = ?, 
                last_name = ?, 
                birth_date = ?, 
                diagnosis = ?, 
                school_grade = ?, 
                school_name = ?, 
                parent_contact = ?,
                drive_link = ?
            WHERE id = ?`,
            [first_name, last_name, birth_date, diagnosis, school_grade, school_name, parent_contact, drive_link, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        res.json({ message: "Paciente actualizado correctamente" });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error al actualizar el paciente" });
    }
};

// 5. ELIMINAR PACIENTE
export const deletePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM patients WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        res.sendStatus(204);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error al eliminar el paciente" });
    }
};
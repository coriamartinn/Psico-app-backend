import { pool } from "../db.js";

// 1. Guardar o Actualizar Informe
export const saveReport = async (req, res) => {
    try {
        const { patient_id, contenido, status } = req.body;
        const user_id = req.user.id;

        // Verificamos si ya existe un informe para este paciente (Simplicidad: 1 informe por paciente por ahora)
        const [existing] = await pool.query("SELECT id FROM reports WHERE patient_id = ?", [patient_id]);

        if (existing.length > 0) {
            // ACTUALIZAR (UPDATE)
            await pool.query(
                "UPDATE reports SET motivo=?, tecnicas=?, cognitivo=?, lectoescritura=?, conclusiones=?, status=? WHERE patient_id = ?",
                [contenido.motivo, contenido.tecnicas, contenido.cognitivo, contenido.lectoescritura, contenido.conclusiones, status, patient_id]
            );
        } else {
            // CREAR (INSERT)
            await pool.query(
                "INSERT INTO reports (patient_id, user_id, motivo, tecnicas, cognitivo, lectoescritura, conclusiones, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [patient_id, user_id, contenido.motivo, contenido.tecnicas, contenido.cognitivo, contenido.lectoescritura, contenido.conclusiones, status]
            );
        }

        res.json({ message: status === 'firmado' ? "Informe Firmado y Guardado" : "Borrador Guardado" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al guardar informe" });
    }
};

// 2. Obtener Informe del Paciente
export const getReport = async (req, res) => {
    try {
        const { patientId } = req.params;
        const [rows] = await pool.query("SELECT * FROM reports WHERE patient_id = ?", [patientId]);

        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.json(null); // No hay informe previo
        }
    } catch (error) {
        res.status(500).json({ message: "Error al cargar informe" });
    }
};
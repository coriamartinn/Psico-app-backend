import { pool } from '../db.js';

// 1. OBTENER LISTA DE INFORMES (Historial)
export const getInformes = async (req, res) => {
    try {
        const user_id = req.user.id; // ID del profesional logueado

        // NOTA: Asumo que tu tabla de pacientes se llama 'patients' o 'pacientes'.
        // Si en tu DB se llama 'pacientes', cambia 'JOIN patients' por 'JOIN pacientes'
        const [rows] = await pool.query(`
            SELECT r.id, 
                   r.motivo as tipo, 
                   r.created_at as fecha, 
                   r.status, 
                   p.first_name, p.last_name 
            FROM reports r
            JOIN patients p ON r.patient_id = p.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `, [user_id]);

        // Formateamos para que el Frontend (ListaInformes.jsx) lo entienda
        const informes = rows.map(row => ({
            id: row.id,
            paciente: `${row.first_name} ${row.last_name}`,
            tipo: "Informe Psicopedagógico", // O puedes usar row.tipo si guardas el título ahí
            fecha: new Date(row.fecha).toLocaleDateString('es-AR'),
            firmado: row.status === 'firmado' // Convertimos el ENUM a booleano
        }));

        res.json(informes);
    } catch (error) {
        console.error("Error obteniendo informes:", error);
        res.status(500).json({ message: 'Error al obtener informes' });
    }
};

// 2. FIRMAR INFORME
export const firmarInforme = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        // Actualizamos el status a 'firmado'
        const [result] = await pool.query(
            "UPDATE reports SET status = 'firmado' WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Informe no encontrado o no autorizado' });
        }

        res.json({ message: 'Informe firmado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al firmar informe' });
    }
};

// 3. ELIMINAR INFORME
export const eliminarInforme = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id; // Seguridad extra: verificar que sea del usuario

        const [result] = await pool.query('DELETE FROM reports WHERE id = ? AND user_id = ?', [id, user_id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Informe no encontrado' });

        res.json({ message: 'Informe eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar' });
    }
};

// 4. GUARDAR INFORME (Para el botón "Guardar" o al Generar)
export const crearInforme = async (req, res) => {
    try {
        const {
            paciente_id, // El frontend manda esto
            motivo,
            tecnicas,
            cognitivo,
            lectoescritura,
            conclusiones
        } = req.body;

        const user_id = req.user.id;

        await pool.query(
            `INSERT INTO reports 
            (patient_id, user_id, motivo, tecnicas, cognitivo, lectoescritura, conclusiones, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'borrador')`,
            [paciente_id, user_id, motivo, tecnicas, cognitivo, lectoescritura, conclusiones]
        );

        res.status(201).json({ message: 'Informe guardado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al guardar el informe' });
    }
};
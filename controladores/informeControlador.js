import { pool } from '../db.js';

// 1. OBTENER LISTA DE INFORMES (Historial)
export const getInformes = async (req, res) => {
    try {
        const user_id = req.user.id;

        // CORRECCIÓN: Usamos u.full_name según tu base de datos
        const [rows] = await pool.query(`
            SELECT r.id, 
                   r.motivo as tipo, 
                   r.created_at as fecha, 
                   r.status, 
                   p.first_name as p_nombre, p.last_name as p_apellido,
                   u.full_name
            FROM reports r
            JOIN patients p ON r.patient_id = p.id
            JOIN users u ON r.user_id = u.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `, [user_id]);

        const informes = rows.map(row => ({
            id: row.id,
            paciente: `${row.p_nombre} ${row.p_apellido}`,
            // Usamos directamente full_name
            profesional: row.full_name || "Profesional",
            tipo: row.tipo || "Informe Psicopedagógico",
            fecha: new Date(row.fecha).toLocaleDateString('es-AR'),
            firmado: row.status === 'firmado'
        }));

        res.json(informes);
    } catch (error) {
        console.error("Error obteniendo informes:", error);
        res.status(500).json({ message: 'Error al obtener informes' });
    }
};

// 2. OBTENER UN SOLO INFORME (Detalle para PDF)
export const getInformeById = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        // CORRECCIÓN: Usamos u.full_name
        const [rows] = await pool.query(`
            SELECT 
                r.*, 
                p.first_name as p_first_name, 
                p.last_name as p_last_name,
                COALESCE(u.full_name, 'Profesional') as nombre_profesional, 
                COALESCE(u.matricula, '') as matricula
            FROM reports r
            JOIN patients p ON r.patient_id = p.id
            JOIN users u ON r.user_id = u.id 
            WHERE r.id = ? AND r.user_id = ?
        `, [id, user_id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Informe no encontrado' });
        }

        const data = rows[0];

        res.json({
            ...data,
            first_name: data.p_first_name,
            last_name: data.p_last_name,

            // ✨ Asignamos el nombre completo que viene de la BD
            profesional: data.nombre_profesional,

            matricula: data.matricula ? `Mat. ${data.matricula}` : "Mat. Pendiente"
        });

    } catch (error) {
        console.error("Error en getInformeById:", error);
        res.status(500).json({ message: 'Error al obtener el informe' });
    }
};

// 3. FIRMAR INFORME
export const firmarInforme = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const [result] = await pool.query(
            "UPDATE reports SET status = 'firmado' WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Informe no encontrado' });
        }

        res.json({ message: 'Informe firmado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al firmar informe' });
    }
};

// 4. EDITAR INFORME
export const actualizarInforme = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;
        const { motivo, tecnicas, cognitivo, lectoescritura, conclusiones } = req.body;

        const [check] = await pool.query("SELECT status FROM reports WHERE id = ?", [id]);
        if (check.length > 0 && check[0].status === 'firmado') {
            return res.status(400).json({ message: 'No se puede editar un informe firmado' });
        }

        const [result] = await pool.query(`
            UPDATE reports 
            SET motivo = ?, tecnicas = ?, cognitivo = ?, lectoescritura = ?, conclusiones = ?
            WHERE id = ? AND user_id = ?
        `, [motivo, tecnicas, cognitivo, lectoescritura, conclusiones, id, user_id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: 'No se pudo actualizar' });

        res.json({ message: 'Informe actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar' });
    }
};

// 5. ELIMINAR INFORME
export const eliminarInforme = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const [result] = await pool.query('DELETE FROM reports WHERE id = ? AND user_id = ?', [id, user_id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Informe no encontrado' });

        res.json({ message: 'Informe eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar' });
    }
};

// 6. GUARDAR INFORME
export const crearInforme = async (req, res) => {
    try {
        const {
            paciente_id,
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
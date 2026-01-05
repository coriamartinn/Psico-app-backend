import { pool } from '../db.js';

// 1. OBTENER LISTA DE INFORMES (Historial)
export const getInformes = async (req, res) => {
    try {
        const user_id = req.user.id;
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

        const informes = rows.map(row => ({
            id: row.id,
            paciente: `${row.first_name} ${row.last_name}`,
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

// ✨ 2. NUEVO: OBTENER UN SOLO INFORME (Para ver el detalle completo)

export const getInformeById = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtenemos el ID del usuario que está haciendo la petición 
        // (para asegurar que solo vea sus propios informes si esa es tu regla de negocio)
        const user_id = req.user.id;

        // CONSULTA SQL MEJORADA:
        // 1. Traemos todo del reporte (r.*)
        // 2. Traemos nombre del paciente con alias (p_first_name, p_last_name)
        // 3. Traemos nombre del profesional con alias (u_first_name, u_last_name, matricula)
        const [rows] = await pool.query(`
            SELECT 
                r.*, 
                p.first_name as p_first_name, 
                p.last_name as p_last_name,
                u.first_name as u_first_name, 
                u.last_name as u_last_name, 
                u.matricula
            FROM reports r
            JOIN patients p ON r.patient_id = p.id
            JOIN users u ON r.user_id = u.id 
            WHERE r.id = ? AND r.user_id = ?
        `, [id, user_id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Informe no encontrado' });
        }

        const data = rows[0];

        // ARMAMOS LA RESPUESTA PARA EL FRONTEND
        res.json({
            ...data,

            // Mapeamos los datos del PACIENTE (para que el título del PDF salga bien)
            first_name: data.p_first_name,
            last_name: data.p_last_name,

            // ✨ AQUÍ ESTÁ LA CLAVE: Armamos el nombre del PROFESIONAL desde la BD
            profesional: `${data.u_first_name} ${data.u_last_name}`,

            // Enviamos la matrícula (o un texto por defecto si es null)
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

// ✨ 4. NUEVO: EDITAR INFORME (Antes de firmar)
export const actualizarInforme = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;
        const { motivo, tecnicas, cognitivo, lectoescritura, conclusiones } = req.body;

        // Validamos que el informe no esté firmado ya (opcional, pero recomendado)
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

        // OJO: Asegúrate de que tu tabla en MySQL tenga estas columnas
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
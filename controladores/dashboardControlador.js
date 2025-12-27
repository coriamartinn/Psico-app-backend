import { pool } from "../db.js";

export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Métricas Básicas
        const [totalRows] = await pool.query("SELECT COUNT(*) as total FROM patients WHERE user_id = ?", [userId]);
        const [escuelasRows] = await pool.query("SELECT COUNT(DISTINCT school_name) as total FROM patients WHERE user_id = ?", [userId]);

        // 2. Gráfico 1: Diagnósticos (Torta)
        const [diagnosticosRows] = await pool.query(
            "SELECT diagnosis, COUNT(*) as cantidad FROM patients WHERE user_id = ? GROUP BY diagnosis",
            [userId]
        );

        // 3. Gráfico 2: Nivel Escolar (Barras) - ¡NUEVO!
        // Esto les encanta para ver el perfil de su consultorio
        const [escolaridadRows] = await pool.query(
            "SELECT school_grade, COUNT(*) as cantidad FROM patients WHERE user_id = ? GROUP BY school_grade ORDER BY cantidad DESC LIMIT 5",
            [userId]
        );

        // 4. Últimos Pacientes Agregados (Para lista rápida)
        const [recientesRows] = await pool.query(
            "SELECT first_name, last_name, diagnosis FROM patients WHERE user_id = ? ORDER BY id DESC LIMIT 3",
            [userId]
        );

        res.json({
            totalPacientes: totalRows[0].total,
            totalEscuelas: escuelasRows[0].total,
            distribucionDiagnosticos: diagnosticosRows,
            distribucionEscolaridad: escolaridadRows, // Dato nuevo
            pacientesRecientes: recientesRows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al calcular estadísticas" });
    }
};
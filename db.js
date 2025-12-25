import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT, // <--- Agregamos el puerto (Aiven usa uno raro, no el 3306)
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // 👇 ESTO ES LO CRÍTICO PARA LA NUBE 👇
    ssl: {
        rejectUnauthorized: false
    }
});

export const pool = connection.promise();
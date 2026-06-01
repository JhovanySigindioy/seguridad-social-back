import db from './src/config/database.js';
async function migrateEndDates() {
    console.log('Iniciando migración de fechas de fin...');
    try {
        const [result] = await db.query(`
      UPDATE affiliations 
      SET end_date = DATE_ADD(start_date, INTERVAL 30 DAY) 
      WHERE end_date IS NULL
    `);
        console.log(`Migración completada exitosamente. Se actualizaron ${result.affectedRows} registros.`);
    }
    catch (error) {
        console.error('Error durante la migración:', error);
    }
    finally {
        process.exit(0);
    }
}
migrateEndDates();
//# sourceMappingURL=migrate-end-dates.js.map
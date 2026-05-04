-- =====================================================
-- MIGRACIÓN: Nuevo modelo de afiliaciones con fechas
-- Basado en Decreto 2616 de 2013 - Cotización por fracciones de mes
-- Opción elegida: A (Sin Traslape)
-- =====================================================

-- 1. Agregar nuevas columnas a monthly_affiliations
ALTER TABLE monthly_affiliations
ADD COLUMN start_date DATE NOT NULL,
ADD COLUMN end_date DATE NULL COMMENT 'NULL = afiliación activa (sin retiro)',
ADD COLUMN status ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
ADD COLUMN days_worked INT NULL COMMENT 'Días realmente cotizados en el período',
ADD COLUMN observation VARCHAR(500) NULL COMMENT 'Observaciones o novedad de retiro',
ADD COLUMN withdrawal_reason VARCHAR(100) NULL COMMENT 'Motivo de retiro: Voluntario, FinContrato, Licencia, Otro',
ADD COLUMN withdrawal_observations TEXT NULL COMMENT 'Detalles del retiro',
ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP;

-- 2. Actualizar registros existentes con valores por defecto
-- Calcular start_date basado en month/year existentes
UPDATE monthly_affiliations 
SET start_date = STR_TO_DATE(CONCAT('1/', month, '/', year), '%d/%m/%Y')
WHERE start_date IS NULL OR start_date = '0000-00-00';

-- Marcar las que tienen gov_record_at como inactivas
UPDATE monthly_affiliations
SET status = 'Inactivo'
WHERE gov_record_at IS NOT NULL AND gov_record_at != '0000-00-00' AND gov_record_at != '1970-01-01 00:00:00';

-- Las demás quedan activas
UPDATE monthly_affiliations
SET status = 'Activo'
WHERE status IS NULL OR status = '';

-- 3. Eliminar la constraint única vieja que bloqueaba por mes/año
ALTER TABLE monthly_affiliations DROP INDEX uk_affiliation_period;

-- 4. Crear nuevo índice único por client_employer + start_date (evita doble afiliación el mismo día)
ALTER TABLE monthly_affiliations
ADD UNIQUE INDEX uk_affiliation_client_start (client_employer_id, start_date);

-- 5. Agregar índice para búsquedas rápidas por rango de fechas
ALTER TABLE monthly_affiliations
ADD INDEX idx_affiliation_date_range (client_employer_id, start_date, end_date);

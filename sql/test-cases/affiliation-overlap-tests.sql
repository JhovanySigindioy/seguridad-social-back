-- =====================================================
-- TEST CASES: Affiliation Overlap Validation
-- Opción A (Sin Traslape)
-- =====================================================

-- Setup: Datos de prueba
-- INSERT INTO clients (id, first_name, first_lastname, identification, office_id) VALUES (99, 'Test', 'User', '999999', 1);
-- INSERT INTO companies (id, name, agency_id) VALUES (99, 'Empresa Test', 1);
-- INSERT INTO client_employers (id, client_id, company_id, office_id, is_active, start_date) VALUES (99, 99, 99, 1, 1, CURDATE());

-- =====================================================
-- CASO EXITOSO 1: Afiliación del 01/05 al 15/05
-- y segunda afiliación del 18/05 al 31/05 (Mismo mes, sin traslape)
-- =====================================================

-- Paso 1: Crear primera afiliación (mayo, activa)
-- INSERT INTO monthly_affiliations 
--   (client_employer_id, start_date, end_date, status, month, year, days_worked, value, payment_status, created_by)
-- VALUES 
--   (99, '2026-05-01', '2026-05-15', 'Inactivo', 5, 2026, 15, 150000, 'Pagado', 1);

-- Paso 2: Crear segunda afiliación (mayo, misma empresa, inicia después del retiro)
-- INSERT INTO monthly_affiliations 
--   (client_employer_id, start_date, end_date, status, month, year, days_worked, value, payment_status, created_by)
-- VALUES 
--   (99, '2026-05-18', '2026-05-31', 'Inactivo', 5, 2026, 14, 140000, 'Pendiente', 1);

-- Resultado: ✅ ÉXITO - Las fechas no se traslapan


-- =====================================================
-- CASO EXITOSO 2: Afiliación del 01/05 al 15/05
-- y segunda afiliación del 20/05 al 31/05 en OTRA empresa
-- =====================================================

-- Paso 1: Crear relación con segunda empresa
-- INSERT INTO client_employers (client_id, company_id, office_id, is_active, start_date) 
-- VALUES (99, 98, 1, 1, CURDATE());  -- company_id = 98 = otra empresa

-- Paso 2: Crear primera afiliación
-- INSERT INTO monthly_affiliations 
--   (client_employer_id, start_date, end_date, status, month, year, days_worked, value, payment_status, created_by)
-- VALUES 
--   (99, '2026-05-01', '2026-05-15', 'Inactivo', 5, 2026, 15, 150000, 'Pagado', 1);

-- Paso 3: Crear segunda afiliación (diferente empresa)
-- INSERT INTO monthly_affiliations 
--   (client_employer_id, start_date, end_date, status, month, year, days_worked, value, payment_status, created_by)
-- VALUES 
--   (100, '2026-05-20', '2026-05-31', 'Inactivo', 5, 2026, 12, 120000, 'Pendiente', 1);

-- Resultado: ✅ ÉXITO - Mismo mes, diferentes empresas, sin traslape


-- =====================================================
-- CASO ERROR 1: Intentar registrar afiliación que inicia 
-- ANTES de que termine la anterior (cuando no se permite traslape)
-- =====================================================

-- Estado: Existe afiliación activa del 01/05 al 15/05
-- Intento: Registrar del 10/05 al 20/05

-- INSERT INTO monthly_affiliations 
--   (client_employer_id, start_date, end_date, status, month, year, days_worked, value, payment_status, created_by)
-- VALUES 
--   (99, '2026-05-10', '2026-05-20', 'Activo', 5, 2026, 11, 110000, 'Pendiente', 1);

-- Error esperado: ❌ "No puedes crear una nueva afiliación que inicie el 2026-05-10. 
-- La afiliación anterior terminó el 2026-05-15. 
-- La nueva fecha de inicio debe ser al menos un día después."


-- =====================================================
-- CASO ERROR 2: Intentar registrar afiliación 
-- SIN cerrar la anterior (afiliación activa sin end_date)
-- =====================================================

-- Estado: Afiliación ACTIVA sin fecha de retiro
-- INSERT INTO monthly_affiliations 
--   (client_employer_id, start_date, end_date, status, month, year, days_worked, value, payment_status, created_by)
-- VALUES 
--   (99, '2026-05-01', NULL, 'Activo', 5, 2026, NULL, 150000, 'Pendiente', 1);

-- Intento: Registrar nueva afiliación
-- INSERT INTO monthly_affiliations 
--   (client_employer_id, start_date, end_date, status, month, year, days_worked, value, payment_status, created_by)
-- VALUES 
--   (99, '2026-05-20', '2026-05-31', 'Activo', 5, 2026, 12, 120000, 'Pendiente', 1);

-- Error esperado: ❌ "El trabajador ya tiene una afiliación activa sin fecha de retiro. 
-- Cierra la afiliación actual antes de crear una nueva."


-- =====================================================
-- CASO EXITOSO 3: Nuevo trabajador sin afiliaciones previas
-- =====================================================

-- INSERT INTO monthly_affiliations 
--   (client_employer_id, start_date, end_date, status, month, year, days_worked, value, payment_status, created_by)
-- VALUES 
--   (99, '2026-05-01', NULL, 'Activo', 5, 2026, NULL, 150000, 'Pendiente', 1);

-- Resultado: ✅ ÉXITO - Primera afiliación del trabajador


-- =====================================================
-- CASO ERROR 3: Fecha de inicio POSTERIOR a fecha de fin
-- =====================================================

-- INSERT INTO monthly_affiliations 
--   (client_employer_id, start_date, end_date, status, month, year, days_worked, value, payment_status, created_by)
-- VALUES 
--   (99, '2026-05-20', '2026-05-10', 'Inactivo', 5, 2026, -10, 120000, 'Pendiente', 1);

-- Error esperado: ❌ "La fecha de inicio debe ser anterior a la fecha de fin."


-- =====================================================
-- CASO EXITOSO 4: Cerrar afiliación activa y crear nueva
-- =====================================================

-- Paso 1: Crear afiliación activa
-- INSERT INTO monthly_affiliations 
--   (client_employer_id, start_date, end_date, status, month, year, days_worked, value, payment_status, created_by)
-- VALUES 
--   (99, '2026-05-01', NULL, 'Activo', 5, 2026, NULL, 150000, 'Pendiente', 1);

-- Paso 2: Cerrar la afiliación (UPDATE con fecha de fin)
-- UPDATE monthly_affiliations 
-- SET end_date = '2026-05-15', status = 'Inactivo', days_worked = 15
-- WHERE id = (SELECT id FROM monthly_affiliations WHERE client_employer_id = 99 AND status = 'Activo' ORDER BY start_date DESC LIMIT 1);

-- Paso 3: Crear nueva afiliación
-- INSERT INTO monthly_affiliations 
--   (client_employer_id, start_date, end_date, status, month, year, days_worked, value, payment_status, created_by)
-- VALUES 
--   (99, '2026-05-16', '2026-05-31', 'Inactivo', 5, 2026, 16, 160000, 'Pendiente', 1);

-- Resultado: ✅ ÉXITO - Afiliación cerrada y nueva creada correctamente

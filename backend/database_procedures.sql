-- Archivo: database_procedures.sql
-- Descripción: Procedimientos, triggers y vistas para Mobility 4 You
-- Versión: 3.0 - Corregido para Django
-- Fecha: 2025-05-24

-- ====================================
-- 1. CONFIGURACIÓN INICIAL
-- ====================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET COLLATION_CONNECTION = utf8mb4_unicode_ci;
SET TIME_ZONE = '+00:00';
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ====================================
-- 2. TRIGGERS
-- ====================================

DELIMITER $$

-- Trigger para normalizar direcciones a minúsculas
DROP TRIGGER IF EXISTS before_insert_direccion$$
CREATE TRIGGER before_insert_direccion
BEFORE INSERT ON direccion
FOR EACH ROW
BEGIN
    SET NEW.ciudad = LOWER(NEW.ciudad);
    SET NEW.provincia = LOWER(NEW.provincia);
    SET NEW.pais = LOWER(NEW.pais);
END$$

DROP TRIGGER IF EXISTS before_update_direccion$$
CREATE TRIGGER before_update_direccion
BEFORE UPDATE ON direccion
FOR EACH ROW
BEGIN
    SET NEW.ciudad = LOWER(NEW.ciudad);
    SET NEW.provincia = LOWER(NEW.provincia);
    SET NEW.pais = LOWER(NEW.pais);
END$$

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS before_update_usuario$$
CREATE TRIGGER before_update_usuario
BEFORE UPDATE ON usuario
FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END$$

DROP TRIGGER IF EXISTS before_update_vehiculo$$
CREATE TRIGGER before_update_vehiculo
BEFORE UPDATE ON vehiculo
FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END$$

DROP TRIGGER IF EXISTS before_update_reserva$$
CREATE TRIGGER before_update_reserva
BEFORE UPDATE ON reserva
FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END$$

-- Trigger para validar fechas de reserva
DROP TRIGGER IF EXISTS before_insert_reserva$$
CREATE TRIGGER before_insert_reserva
BEFORE INSERT ON reserva
FOR EACH ROW
BEGIN
    IF NEW.fecha_devolucion <= NEW.fecha_recogida THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'La fecha de devolución debe ser posterior a la fecha de recogida';
    END IF;
    
    -- Establecer importes según método de pago si no vienen informados
    IF NEW.metodo_pago = 'tarjeta' AND NEW.importe_pagado_inicial IS NULL THEN
        SET NEW.importe_pagado_inicial = NEW.precio_total;
        SET NEW.importe_pendiente_inicial = 0;
    ELSEIF NEW.metodo_pago = 'efectivo' AND NEW.importe_pagado_inicial IS NULL THEN
        SET NEW.importe_pagado_inicial = 0;
        SET NEW.importe_pendiente_inicial = NEW.precio_total;
    END IF;
END$$

-- Trigger para validar edad del conductor
DROP TRIGGER IF EXISTS before_insert_reserva_conductor$$
CREATE TRIGGER before_insert_reserva_conductor
BEFORE INSERT ON reserva_conductor
FOR EACH ROW
BEGIN
    DECLARE v_edad_conductor INT;
    DECLARE v_edad_minima INT;
    DECLARE v_vehiculo_id INT;
    
    -- Obtener edad del conductor
    SELECT TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) INTO v_edad_conductor
    FROM usuario
    WHERE id = NEW.conductor_id;
    
    -- Obtener vehículo de la reserva
    SELECT vehiculo_id INTO v_vehiculo_id
    FROM reserva
    WHERE id = NEW.reserva_id;
    
    -- Obtener edad mínima del grupo
    SELECT gc.edad_minima INTO v_edad_minima
    FROM vehiculo v
    JOIN grupo_coche gc ON v.grupo_id = gc.id
    WHERE v.id = v_vehiculo_id;
    
    IF v_edad_conductor < v_edad_minima THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'El conductor no cumple la edad mínima requerida para este vehículo';
    END IF;
END$$

DELIMITER ;

-- ====================================
-- 3. ÍNDICES ADICIONALES (solo si no existen)
-- ====================================

-- Índices para mejorar búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_vehiculo_disponibilidad ON vehiculo(disponible, activo, categoria_id);
CREATE INDEX IF NOT EXISTS idx_reserva_usuario_estado ON reserva(usuario_id, estado);
CREATE INDEX IF NOT EXISTS idx_tarifa_vigente ON tarifa_vehiculo(vehiculo_id, fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reserva_metodo_pago ON reserva(metodo_pago, estado);
CREATE INDEX IF NOT EXISTS idx_reserva_pagos ON reserva(importe_pendiente_inicial, importe_pendiente_extra);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_activo ON usuario(rol, activo);
CREATE INDEX IF NOT EXISTS idx_contenido_tipo_activo ON contenido(tipo, activo);
CREATE INDEX IF NOT EXISTS idx_reserva_fechas_estado ON reserva(fecha_recogida, fecha_devolucion, estado);
CREATE INDEX IF NOT EXISTS idx_tarifa_vehiculo_fechas ON tarifa_vehiculo(vehiculo_id, fecha_inicio, fecha_fin);

-- ====================================
-- 4. VISTAS ÚTILES
-- ====================================

-- Vista para vehículos disponibles con precio actual
DROP VIEW IF EXISTS v_vehiculos_disponibles;
CREATE VIEW v_vehiculos_disponibles AS
SELECT 
    v.*,
    c.nombre AS categoria_nombre,
    g.nombre AS grupo_nombre,
    g.edad_minima,
    t.precio_dia AS precio_actual,
    (SELECT imagen FROM imagen_vehiculo WHERE vehiculo_id = v.id AND portada = 1 LIMIT 1) AS imagen_principal
FROM vehiculo v
JOIN categoria c ON v.categoria_id = c.id
JOIN grupo_coche g ON v.grupo_id = g.id
LEFT JOIN tarifa_vehiculo t ON v.id = t.vehiculo_id 
    AND CURDATE() BETWEEN t.fecha_inicio AND IFNULL(t.fecha_fin, '9999-12-31')
WHERE v.disponible = 1 AND v.activo = 1;

-- Vista para reservas activas
DROP VIEW IF EXISTS v_reservas_activas;
CREATE VIEW v_reservas_activas AS
SELECT 
    r.*,
    u.first_name,
    u.last_name,
    u.email,
    v.marca,
    v.modelo,
    v.matricula,
    lr.nombre AS lugar_recogida_nombre,
    ld.nombre AS lugar_devolucion_nombre,
    pp.titulo AS politica_titulo
FROM reserva r
LEFT JOIN usuario u ON r.usuario_id = u.id
JOIN vehiculo v ON r.vehiculo_id = v.id
JOIN lugar lr ON r.lugar_recogida_id = lr.id
JOIN lugar ld ON r.lugar_devolucion_id = ld.id
JOIN politica_pago pp ON r.politica_pago_id = pp.id
WHERE r.estado IN ('pendiente', 'confirmada')
    AND r.fecha_devolucion >= CURDATE();

-- Vista para reservas con información de pagos
DROP VIEW IF EXISTS v_reservas_con_pagos;
CREATE VIEW v_reservas_con_pagos AS
SELECT 
    r.*,
    (r.importe_pendiente_inicial + IFNULL(r.importe_pendiente_extra, 0)) AS importe_pendiente_total,
    (r.importe_pagado_inicial + IFNULL(r.importe_pagado_extra, 0)) AS importe_pagado_total,
    u.first_name,
    u.last_name,
    u.email,
    v.marca,
    v.modelo,
    pp.titulo AS politica_titulo
FROM reserva r
LEFT JOIN usuario u ON r.usuario_id = u.id
JOIN vehiculo v ON r.vehiculo_id = v.id
JOIN politica_pago pp ON r.politica_pago_id = pp.id;

-- Vista para usuarios con estadísticas de reservas
DROP VIEW IF EXISTS v_usuarios_con_reservas;
CREATE VIEW v_usuarios_con_reservas AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.rol,
    u.activo,
    COUNT(DISTINCT r.id) AS total_reservas,
    SUM(CASE WHEN r.estado = 'confirmada' THEN 1 ELSE 0 END) AS reservas_confirmadas,
    SUM(CASE WHEN r.estado = 'cancelada' THEN 1 ELSE 0 END) AS reservas_canceladas,
    SUM(CASE WHEN r.estado = 'pendiente' THEN 1 ELSE 0 END) AS reservas_pendientes
FROM usuario u
LEFT JOIN reserva r ON u.id = r.usuario_id
GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.rol, u.activo;

-- ====================================
-- 5. PROCEDIMIENTOS ALMACENADOS
-- ====================================

DELIMITER $$

-- Procedimiento para verificar disponibilidad de vehículo
DROP PROCEDURE IF EXISTS sp_verificar_disponibilidad$$
CREATE PROCEDURE sp_verificar_disponibilidad(
    IN p_vehiculo_id INT,
    IN p_fecha_inicio DATETIME,
    IN p_fecha_fin DATETIME,
    OUT p_disponible BOOLEAN
)
BEGIN
    DECLARE v_count INT DEFAULT 0;
    
    -- Verificar que el vehículo existe y está activo
    SELECT COUNT(*) INTO v_count
    FROM vehiculo
    WHERE id = p_vehiculo_id AND activo = 1 AND disponible = 1;
    
    IF v_count = 0 THEN
        SET p_disponible = FALSE;
    ELSE
        -- Verificar reservas solapadas
        SELECT COUNT(*) INTO v_count
        FROM reserva
        WHERE vehiculo_id = p_vehiculo_id
            AND estado IN ('confirmada', 'pendiente')
            AND (
                (fecha_recogida <= p_fecha_inicio AND fecha_devolucion > p_fecha_inicio)
                OR (fecha_recogida < p_fecha_fin AND fecha_devolucion >= p_fecha_fin)
                OR (fecha_recogida >= p_fecha_inicio AND fecha_devolucion <= p_fecha_fin)
            );
        
        -- Verificar mantenimientos programados
        IF v_count = 0 THEN
            SELECT COUNT(*) INTO v_count
            FROM mantenimiento
            WHERE vehiculo_id = p_vehiculo_id
                AND DATE(fecha) BETWEEN DATE(p_fecha_inicio) AND DATE(p_fecha_fin);
        END IF;
        
        SET p_disponible = (v_count = 0);
    END IF;
END$$

-- Procedimiento para calcular precio de reserva
DROP PROCEDURE IF EXISTS sp_calcular_precio_reserva$$
CREATE PROCEDURE sp_calcular_precio_reserva(
    IN p_vehiculo_id INT,
    IN p_fecha_inicio DATETIME,
    IN p_fecha_fin DATETIME,
    IN p_promocion_id INT,
    OUT p_precio_dia DECIMAL(10,2),
    OUT p_precio_base DECIMAL(10,2),
    OUT p_descuento DECIMAL(10,2),
    OUT p_impuestos DECIMAL(10,2),
    OUT p_precio_total DECIMAL(10,2)
)
BEGIN
    DECLARE v_dias INT;
    DECLARE v_precio_dia_tarifa DECIMAL(8,2);
    DECLARE v_descuento_pct DECIMAL(5,2) DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- En caso de error, devolver valores por defecto
        SET p_precio_dia = 50.00;
        SET p_precio_base = 50.00;
        SET p_descuento = 0.00;
        SET p_impuestos = 10.50;
        SET p_precio_total = 60.50;
    END;
    
    -- Calcular días (mínimo 1)
    SET v_dias = GREATEST(1, DATEDIFF(DATE(p_fecha_fin), DATE(p_fecha_inicio)));
    
    -- Obtener precio por día según temporada
    SELECT precio_dia INTO v_precio_dia_tarifa
    FROM tarifa_vehiculo
    WHERE vehiculo_id = p_vehiculo_id
        AND DATE(p_fecha_inicio) BETWEEN fecha_inicio AND IFNULL(fecha_fin, '9999-12-31')
    ORDER BY fecha_inicio DESC
    LIMIT 1;
    
    -- Si no hay tarifa específica, usar precio base de 50€
    IF v_precio_dia_tarifa IS NULL THEN
        SET v_precio_dia_tarifa = 50.00;
    END IF;
    
    SET p_precio_dia = v_precio_dia_tarifa;
    SET p_precio_base = v_dias * v_precio_dia_tarifa;
    
    -- Aplicar promoción si existe y está activa
    IF p_promocion_id IS NOT NULL THEN
        SELECT descuento_pct INTO v_descuento_pct
        FROM promocion
        WHERE id = p_promocion_id
            AND activo = 1
            AND DATE(p_fecha_inicio) BETWEEN fecha_inicio AND fecha_fin;
            
        IF v_descuento_pct IS NULL THEN
            SET v_descuento_pct = 0;
        END IF;
    END IF;
    
    -- Calcular descuento
    SET p_descuento = p_precio_base * (v_descuento_pct / 100);
    
    -- Calcular impuestos (21% IVA sobre precio con descuento)
    SET p_impuestos = (p_precio_base - p_descuento) * 0.21;
    
    -- Calcular total
    SET p_precio_total = p_precio_base - p_descuento + p_impuestos;
END$$

-- Procedimiento para procesar pagos de reserva
DROP PROCEDURE IF EXISTS sp_procesar_pago_reserva$$
CREATE PROCEDURE sp_procesar_pago_reserva(
    IN p_reserva_id INT,
    IN p_tipo_pago VARCHAR(20), -- 'inicial' o 'extra'
    IN p_importe DECIMAL(10,2),
    OUT p_resultado VARCHAR(100)
)
BEGIN
    DECLARE v_estado_actual VARCHAR(20);
    DECLARE v_existe INT DEFAULT 0;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 'ERROR: Error en la base de datos';
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    -- Verificar que la reserva existe
    SELECT COUNT(*), estado INTO v_existe, v_estado_actual
    FROM reserva
    WHERE id = p_reserva_id;
    
    IF v_existe = 0 THEN
        SET p_resultado = 'ERROR: Reserva no encontrada';
        ROLLBACK;
    ELSEIF v_estado_actual = 'cancelada' THEN
        SET p_resultado = 'ERROR: Reserva cancelada';
        ROLLBACK;
    ELSE
        IF p_tipo_pago = 'inicial' THEN
            -- Actualizar pago inicial
            UPDATE reserva
            SET importe_pagado_inicial = importe_pagado_inicial + p_importe,
                importe_pendiente_inicial = GREATEST(0, importe_pendiente_inicial - p_importe),
                estado = CASE 
                    WHEN importe_pendiente_inicial - p_importe <= 0 THEN 'confirmada'
                    ELSE estado
                END,
                updated_at = NOW()
            WHERE id = p_reserva_id;
        ELSEIF p_tipo_pago = 'extra' THEN
            -- Actualizar pago extra
            UPDATE reserva
            SET importe_pagado_extra = IFNULL(importe_pagado_extra, 0) + p_importe,
                importe_pendiente_extra = GREATEST(0, IFNULL(importe_pendiente_extra, 0) - p_importe),
                updated_at = NOW()
            WHERE id = p_reserva_id;
        ELSE
            SET p_resultado = 'ERROR: Tipo de pago inválido';
            ROLLBACK;
        END IF;
        
        IF ROW_COUNT() > 0 THEN
            SET p_resultado = 'OK: Pago procesado correctamente';
            COMMIT;
        ELSE
            SET p_resultado = 'ERROR: No se pudo procesar el pago';
            ROLLBACK;
        END IF;
    END IF;
END$$

-- Procedimiento para obtener vehículos disponibles en un rango de fechas
DROP PROCEDURE IF EXISTS sp_buscar_vehiculos_disponibles$$
CREATE PROCEDURE sp_buscar_vehiculos_disponibles(
    IN p_fecha_inicio DATETIME,
    IN p_fecha_fin DATETIME,
    IN p_categoria_id INT,
    IN p_lugar_id INT
)
BEGIN
    SELECT DISTINCT
        v.*,
        c.nombre AS categoria_nombre,
        g.nombre AS grupo_nombre,
        g.edad_minima,
        tv.precio_dia,
        (SELECT url FROM imagen_vehiculo WHERE vehiculo_id = v.id AND portada = 1 LIMIT 1) AS imagen_principal
    FROM vehiculo v
    JOIN categoria c ON v.categoria_id = c.id
    JOIN grupo_coche g ON v.grupo_id = g.id
    LEFT JOIN tarifa_vehiculo tv ON v.id = tv.vehiculo_id 
        AND DATE(p_fecha_inicio) BETWEEN tv.fecha_inicio AND IFNULL(tv.fecha_fin, '9999-12-31')
    WHERE v.activo = 1 
        AND v.disponible = 1
        AND (p_categoria_id IS NULL OR v.categoria_id = p_categoria_id)
        AND v.id NOT IN (
            SELECT DISTINCT vehiculo_id
            FROM reserva
            WHERE estado IN ('confirmada', 'pendiente')
            AND (
                (fecha_recogida <= p_fecha_inicio AND fecha_devolucion > p_fecha_inicio)
                OR (fecha_recogida < p_fecha_fin AND fecha_devolucion >= p_fecha_fin)
                OR (fecha_recogida >= p_fecha_inicio AND fecha_devolucion <= p_fecha_fin)
            )
        )
    ORDER BY tv.precio_dia ASC, v.marca, v.modelo;
END$$

DELIMITER ;

-- ====================================
-- FIN DEL SCRIPT
-- ====================================
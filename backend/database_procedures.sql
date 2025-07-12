-- Archivo: database_procedures_postgresql.sql
-- Descripción: Procedimientos, triggers y funciones para Mobility 4 You - PostgreSQL
-- Versión: 4.0 - Migrado a PostgreSQL
-- Fecha: 2025-01-12

-- ====================================
-- 1. CONFIGURACIÓN INICIAL
-- ====================================

-- PostgreSQL no requiere configuración específica de encoding
-- El timezone se configura en settings.py de Django

-- ====================================
-- 2. FUNCIONES Y TRIGGERS
-- ====================================

-- Función para normalizar direcciones a minúsculas
CREATE OR REPLACE FUNCTION normalize_direccion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ciudad := LOWER(NEW.ciudad);
    NEW.provincia := LOWER(NEW.provincia);
    NEW.pais := LOWER(NEW.pais);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para validar fechas de reserva
CREATE OR REPLACE FUNCTION validate_reserva_dates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fecha_devolucion <= NEW.fecha_recogida THEN
        RAISE EXCEPTION 'La fecha de devolución debe ser posterior a la fecha de recogida';
    END IF;
    
    -- Establecer importes según método de pago si no vienen informados
    IF NEW.metodo_pago = 'tarjeta' AND NEW.importe_pagado_inicial IS NULL THEN
        NEW.importe_pagado_inicial := NEW.precio_total;
        NEW.importe_pendiente_inicial := 0;
    ELSIF NEW.metodo_pago = 'efectivo' AND NEW.importe_pagado_inicial IS NULL THEN
        NEW.importe_pagado_inicial := 0;
        NEW.importe_pendiente_inicial := NEW.precio_total;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para validar edad del conductor
CREATE OR REPLACE FUNCTION validate_conductor_age()
RETURNS TRIGGER AS $$
DECLARE
    v_edad_conductor INTEGER;
    v_edad_minima INTEGER;
    v_vehiculo_id INTEGER;
BEGIN
    -- Obtener edad del conductor
    SELECT EXTRACT(YEAR FROM AGE(fecha_nacimiento)) INTO v_edad_conductor
    FROM usuarios_usuario
    WHERE id = NEW.conductor_id;
    
    -- Obtener vehículo de la reserva
    SELECT vehiculo_id INTO v_vehiculo_id
    FROM reservas_reserva
    WHERE id = NEW.reserva_id;
    
    -- Obtener edad mínima del grupo
    SELECT gc.edad_minima INTO v_edad_minima
    FROM vehiculos_vehiculo v
    JOIN vehiculos_grupocoche gc ON v.grupo_id = gc.id
    WHERE v.id = v_vehiculo_id;
    
    IF v_edad_conductor < v_edad_minima THEN
        RAISE EXCEPTION 'El conductor no cumple la edad mínima requerida para este vehículo';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- 3. CREACIÓN DE TRIGGERS
-- ====================================

-- Triggers para normalizar direcciones (si existen las tablas)
-- Nota: Estos triggers se crearán solo si las tablas correspondientes existen

-- CREATE TRIGGER IF NOT EXISTS trigger_normalize_direccion_insert
--     BEFORE INSERT ON lugares_direccion
--     FOR EACH ROW EXECUTE FUNCTION normalize_direccion();

-- CREATE TRIGGER IF NOT EXISTS trigger_normalize_direccion_update
--     BEFORE UPDATE ON lugares_direccion
--     FOR EACH ROW EXECUTE FUNCTION normalize_direccion();

-- Triggers para updated_at automático
-- CREATE TRIGGER IF NOT EXISTS trigger_usuario_updated_at
--     BEFORE UPDATE ON usuarios_usuario
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER IF NOT EXISTS trigger_vehiculo_updated_at
--     BEFORE UPDATE ON vehiculos_vehiculo
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER IF NOT EXISTS trigger_reserva_updated_at
--     BEFORE UPDATE ON reservas_reserva
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para validaciones
-- CREATE TRIGGER IF NOT EXISTS trigger_validate_reserva_dates
--     BEFORE INSERT ON reservas_reserva
--     FOR EACH ROW EXECUTE FUNCTION validate_reserva_dates();

-- CREATE TRIGGER IF NOT EXISTS trigger_validate_conductor_age
--     BEFORE INSERT ON reservas_reservaconductor
--     FOR EACH ROW EXECUTE FUNCTION validate_conductor_age();

-- ====================================
-- 4. ÍNDICES ADICIONALES
-- ====================================

-- Nota: Los índices se crearán mediante migraciones de Django
-- Aquí se documentan para referencia:

-- Índices para mejorar búsquedas comunes
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehiculo_disponibilidad 
--     ON vehiculos_vehiculo(disponible, activo, categoria_id);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reserva_usuario_estado 
--     ON reservas_reserva(usuario_id, estado);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tarifa_vigente 
--     ON vehiculos_tarifavehiculo(vehiculo_id, fecha_inicio, fecha_fin);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reserva_metodo_pago 
--     ON reservas_reserva(metodo_pago, estado);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reserva_pagos 
--     ON reservas_reserva(importe_pendiente_inicial, importe_pendiente_extra);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuario_rol_activo 
--     ON usuarios_usuario(rol, activo);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reserva_fechas_estado 
--     ON reservas_reserva(fecha_recogida, fecha_devolucion, estado);

-- ====================================
-- 5. VISTAS ÚTILES
-- ====================================

-- Vista para vehículos disponibles con precio actual
-- Nota: Las vistas se implementarán mediante Django ORM
-- Esta es solo documentación de referencia

-- CREATE OR REPLACE VIEW v_vehiculos_disponibles AS
-- SELECT 
--     v.*,
--     c.nombre AS categoria_nombre,
--     g.nombre AS grupo_nombre,
--     g.edad_minima,
--     t.precio_dia AS precio_actual
-- FROM vehiculos_vehiculo v
-- LEFT JOIN vehiculos_categoria c ON v.categoria_id = c.id
-- LEFT JOIN vehiculos_grupocoche g ON v.grupo_id = g.id
-- LEFT JOIN vehiculos_tarifavehiculo t ON v.id = t.vehiculo_id 
--     AND CURRENT_DATE BETWEEN t.fecha_inicio AND t.fecha_fin
-- WHERE v.disponible = true AND v.activo = true;

-- ====================================
-- 6. FUNCIONES DE UTILIDAD
-- ====================================

-- Función para calcular disponibilidad de vehículo
CREATE OR REPLACE FUNCTION check_vehicle_availability(
    p_vehiculo_id INTEGER,
    p_fecha_inicio DATE,
    p_fecha_fin DATE
) RETURNS BOOLEAN AS $$
DECLARE
    reservas_conflicto INTEGER;
BEGIN
    SELECT COUNT(*) INTO reservas_conflicto
    FROM reservas_reserva
    WHERE vehiculo_id = p_vehiculo_id
      AND estado NOT IN ('cancelada', 'rechazada')
      AND (
          (fecha_recogida <= p_fecha_inicio AND fecha_devolucion > p_fecha_inicio)
          OR (fecha_recogida < p_fecha_fin AND fecha_devolucion >= p_fecha_fin)
          OR (fecha_recogida >= p_fecha_inicio AND fecha_devolucion <= p_fecha_fin)
      );
    
    RETURN reservas_conflicto = 0;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener precio de vehículo en fecha específica
CREATE OR REPLACE FUNCTION get_vehicle_price(
    p_vehiculo_id INTEGER,
    p_fecha DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    precio DECIMAL(10,2);
BEGIN
    SELECT t.precio_dia INTO precio
    FROM vehiculos_tarifavehiculo t
    WHERE t.vehiculo_id = p_vehiculo_id
      AND p_fecha BETWEEN t.fecha_inicio AND t.fecha_fin
    ORDER BY t.fecha_inicio DESC
    LIMIT 1;
    
    RETURN COALESCE(precio, 0.00);
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- 7. COMENTARIOS Y DOCUMENTACIÓN
-- ====================================

COMMENT ON FUNCTION normalize_direccion() IS 'Normaliza direcciones a minúsculas antes de insertar/actualizar';
COMMENT ON FUNCTION update_updated_at_column() IS 'Actualiza automáticamente el campo updated_at';
COMMENT ON FUNCTION validate_reserva_dates() IS 'Valida que las fechas de reserva sean correctas y establece importes por defecto';
COMMENT ON FUNCTION validate_conductor_age() IS 'Valida que el conductor cumpla la edad mínima para el vehículo';
COMMENT ON FUNCTION check_vehicle_availability(INTEGER, DATE, DATE) IS 'Verifica si un vehículo está disponible en un rango de fechas';
COMMENT ON FUNCTION get_vehicle_price(INTEGER, DATE) IS 'Obtiene el precio vigente de un vehículo para una fecha específica';

-- ====================================
-- 8. NOTAS DE MIGRACIÓN
-- ====================================

/*
NOTAS IMPORTANTES PARA LA MIGRACIÓN A POSTGRESQL:

1. Triggers y Funciones:
   - Se han migrado de la sintaxis MySQL a PostgreSQL
   - Los triggers usan funciones separadas (buena práctica en PostgreSQL)
   - Se utiliza LANGUAGE plpgsql para funciones con lógica

2. Nombres de Tablas:
   - Se actualizaron para reflejar la estructura de Django (app_model)
   - Ejemplo: 'usuario' -> 'usuarios_usuario'

3. Funciones de Fecha:
   - TIMESTAMPDIFF() -> EXTRACT(YEAR FROM AGE())
   - NOW() se mantiene igual
   - CURDATE() -> CURRENT_DATE

4. Tipos de Datos:
   - INT -> INTEGER
   - Los DECIMAL se mantienen iguales

5. Control de Errores:
   - SIGNAL SQLSTATE -> RAISE EXCEPTION

6. Implementación:
   - Los triggers están comentados para activarlos después de verificar nombres de tablas
   - Los índices se manejan mejor mediante migraciones de Django
   - Las vistas se implementan mejor con Django ORM

7. Funciones Adicionales:
   - Se agregaron funciones de utilidad específicas para PostgreSQL
   - Mejor manejo de tipos de datos y funciones de fecha

PRÓXIMOS PASOS:
1. Verificar nombres exactos de tablas en Django
2. Activar triggers necesarios
3. Implementar índices mediante migraciones
4. Testear funciones de utilidad
*/

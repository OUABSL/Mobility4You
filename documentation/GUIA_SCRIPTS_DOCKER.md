# 🐳 GUÍA DE SCRIPTS DOCKER MODULARES

## 📋 **RESUMEN DE SCRIPTS**

### 1. **`migrate_docker_to_modular.sh`** - ⚠️ **UNA SOLA VEZ**
- **Propósito**: Migrar de arquitectura monolítica a modular
- **Cuándo usar**: Solo durante la primera migración
- **Características**:
  - ✅ Detecta si ya se ejecutó anteriormente
  - 📦 Crea backup automático de BD
  - 🔄 Ofrece opciones si ya se migró
  - 📝 Crea archivo de marca (`.modular_migration_completed`)

### 2. **`docker_daily_operations.sh`** - 🔄 **USO DIARIO**
- **Propósito**: Operaciones rutinarias después de la migración
- **Cuándo usar**: Para tareas diarias de desarrollo/mantenimiento
- **Características**:
  - 🚀 Iniciar/detener/reiniciar contenedores
  - 🔨 Reconstruir backend
  - 📋 Ver logs
  - 🏥 Health checks
  - 🗃️ Backups de BD
  - 🧹 Limpieza de imágenes

## 🚀 **FLUJO DE USO**

### **PASO 1: Migración Inicial (UNA SOLA VEZ)**
```bash
# Desde el directorio raíz del proyecto
chmod +x migrate_docker_to_modular.sh
./migrate_docker_to_modular.sh
```

**Qué hace:**
1. 🔍 Verifica si ya se migró
2. 📦 Backup de BD actual
3. 🛑 Detiene contenedores antiguos
4. 🧹 Limpia imágenes antigas
5. 🔨 Construye imagen modular
6. 🚀 Inicia sistema modular
7. 🏥 Verifica funcionamiento
8. 📝 Crea marca de migración completada

**Resultado esperado:**
```
🎉 ¡MIGRACIÓN COMPLETADA!
📋 Resumen:
  - Backup de BD creado
  - Contenedores antiguos detenidos
  - Nueva imagen modular construida
  - Sistema iniciado con arquitectura modular
  - Archivo de marca creado: ./.modular_migration_completed
```

### **PASO 2: Operaciones Diarias (REPETIBLE)**
```bash
# Para uso diario
chmod +x docker_daily_operations.sh
./docker_daily_operations.sh
```

**Menú interactivo:**
```
🐳 OPERACIONES DIARIAS - DOCKER MODULAR
==================================================
1) 🚀 Iniciar contenedores
2) 🛑 Detener contenedores
3) 🔄 Reiniciar contenedores
4) 🔨 Reconstruir backend
5) 📋 Ver logs del backend
6) 📋 Ver logs de todos los contenedores
7) 🏥 Verificar salud del sistema
8) 🗃️ Backup de base de datos
9) 🧹 Limpiar imágenes no usadas
0) ❌ Salir
```

## ⚠️ **PROTECCIONES IMPLEMENTADAS**

### **migrate_docker_to_modular.sh**
```bash
# Detecta ejecución previa
if [ -f "./.modular_migration_completed" ]; then
    echo "⚠️ MIGRACIÓN YA COMPLETADA ANTERIORMENTE"
    # Ofrece opciones:
    # 1) Salir (recomendado)
    # 2) Forzar re-migración 
    # 3) Solo reiniciar contenedores
fi
```

### **docker_daily_operations.sh**
```bash
# Requiere migración completada
if [ ! -f "./.modular_migration_completed" ]; then
    echo "❌ ERROR: Migración modular no completada"
    echo "   Ejecuta primero: ./migrate_docker_to_modular.sh"
    exit 1
fi
```

## 🔄 **ESCENARIOS COMUNES**

### **Escenario 1: Primera vez**
```bash
# Solo una vez
./migrate_docker_to_modular.sh
# Resultado: Sistema migrado + archivo .modular_migration_completed
```

### **Escenario 2: Desarrollo diario**
```bash
# Cada día que trabajas
./docker_daily_operations.sh
# Seleccionar opción según necesidad
```

### **Escenario 3: Re-ejecutar migración por error**
```bash
./migrate_docker_to_modular.sh
# Te pregunta:
# 1) Salir (recomendado)
# 2) Forzar re-migración (⚠️ usar con cuidado) 
# 3) Solo reiniciar contenedores
```

### **Escenario 4: Reiniciar después de cambios**
```bash
# Opción A: Usar script diario
./docker_daily_operations.sh  # → Opción 3 (Reiniciar)

# Opción B: Manual
cd docker
docker-compose down
docker-compose up -d
```

### **Escenario 5: Cambios en código backend**
```bash
./docker_daily_operations.sh  # → Opción 4 (Reconstruir backend)
```

## 📁 **ARCHIVOS GENERADOS**

### **Durante migración:**
- `.modular_migration_completed` - Marca de migración
- `backups/mobility_backup_YYYYMMDD_HHMMSS.sql` - Backup de BD

### **Durante operaciones diarias:**
- `backups/mobility_backup_YYYYMMDD_HHMMSS.sql` - Backups adicionales

## 🔍 **TROUBLESHOOTING**

### **Problema: "Migración ya completada"**
```bash
# Si necesitas re-migrar
./migrate_docker_to_modular.sh
# → Seleccionar opción 2 (Forzar re-migración)

# O eliminar marca manualmente
rm .modular_migration_completed
./migrate_docker_to_modular.sh
```

### **Problema: "Migración no completada"**
```bash
# Completar migración primero
./migrate_docker_to_modular.sh

# Luego usar operaciones diarias
./docker_daily_operations.sh
```

### **Problema: Contenedores no responden**
```bash
./docker_daily_operations.sh
# → Opción 7 (Verificar salud)
# → Opción 5 (Ver logs backend)
# → Opción 3 (Reiniciar contenedores)
```

## ✅ **COMANDOS RÁPIDOS**

```bash
# Migración inicial (una vez)
./migrate_docker_to_modular.sh

# Iniciar contenedores
./docker_daily_operations.sh  # → Opción 1

# Ver logs
./docker_daily_operations.sh  # → Opción 5

# Reiniciar todo
./docker_daily_operations.sh  # → Opción 3

# Verificar salud
./docker_daily_operations.sh  # → Opción 7

# Backup BD
./docker_daily_operations.sh  # → Opción 8
```

## 🎯 **RESUMEN**

**✅ Una sola ejecución**: `migrate_docker_to_modular.sh`
**🔄 Uso diario**: `docker_daily_operations.sh`
**📝 Archivo de marca**: `.modular_migration_completed`
**🗃️ Backups automáticos**: `backups/`

**El sistema está diseñado para ser seguro, intuitivo y evitar errores de re-migración.**

#!/bin/bash

echo "=== INICIO DEL ENTRYPOINT ==="
echo "Variables de entorno:"
echo "DB_HOST: $DB_HOST"
echo "DB_NAME: $DB_NAME" 
echo "DB_USER: $DB_USER"

echo "Esperando a que la base de datos esté disponible..."
until nc -z $DB_HOST 3306; do
  echo "Base de datos no disponible - esperando..."
  sleep 2
done

echo "Base de datos disponible!"

# Verificar conexión con la base de datos - ✅ COMANDO CORREGIDO
echo "Verificando conexión a la base de datos..."
mysql -h $DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT 1;" || echo "Error conectando a la base de datos"

# Listar aplicaciones instaladas
echo "Aplicaciones instaladas:"
python manage.py showmigrations

# Verificar que Django encuentra las apps
echo "Verificando que Django encuentra la app 'api'..."
python manage.py check api

# Ejecutar migraciones con verbose
echo "Ejecutando makemigrations..."
python manage.py makemigrations --verbosity=2

echo "Ejecutando makemigrations específico para api..."
python manage.py makemigrations api --verbosity=2

echo "Verificando migraciones generadas:"
python manage.py showmigrations

echo "Ejecutando migrate..."
python manage.py migrate --verbosity=2

# Verificar que las tablas se crearon - ✅ COMANDO CORREGIDO
echo "Verificando tablas creadas:"
mysql -h $DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES;" || echo "Error mostrando tablas"

# Verificar tabla lugar específicamente - ✅ COMANDO CORREGIDO
echo "Verificando tabla lugar..."
if mysql -h $DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "DESCRIBE lugar;" 2>/dev/null; then
    echo "✅ Tabla lugar existe - Cargando datos iniciales..."
    python manage.py create_initial_data
    
    # Ejecutar procedimientos SQL
    echo "Cargando procedimientos almacenados y triggers..."
    if [ -f /app/database_procedures.sql ]; then
        mysql -h $DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME < /app/database_procedures.sql
        echo "Procedimientos y triggers cargados correctamente"
    fi
else
    echo "❌ ERROR: Tabla lugar no existe. Las migraciones fallaron!"
    echo "Intentando forzar creación de migraciones..."
    python manage.py makemigrations api --empty
    python manage.py migrate --fake-initial
    exit 1
fi

# Recopilar archivos estáticos
echo "Recopilando archivos estáticos..."
python manage.py collectstatic --noinput

echo "=== INICIANDO SERVIDOR ==="
exec "$@"
#!/bin/bash

echo "=== DEBUG: Variables de Entorno de Base de Datos ==="
echo "POSTGRES_DB: $POSTGRES_DB"
echo "POSTGRES_USER: $POSTGRES_USER" 
echo "POSTGRES_PASSWORD: $POSTGRES_PASSWORD"
echo "POSTGRES_HOST: $POSTGRES_HOST"
echo "DB_NAME: $DB_NAME"
echo "DB_USER: $DB_USER"
echo "DB_PASSWORD: $DB_PASSWORD"
echo "DB_HOST: $DB_HOST"
echo "DATABASE_URL: $DATABASE_URL"
echo "DJANGO_ENV: $DJANGO_ENV"
echo "DJANGO_SETTINGS_MODULE: $DJANGO_SETTINGS_MODULE"
echo "DISABLE_ENV_FILE: $DISABLE_ENV_FILE"
echo "===================================================="

# Probar conexión a la base de datos
echo "Probando conexión a PostgreSQL..."
python manage.py dbshell --command="SELECT 1;" 2>/dev/null && echo "✅ Conexión exitosa" || echo "❌ Error de conexión"

# Verificar configuración de Django
echo "Verificando configuración de Django..."
python manage.py check --database default
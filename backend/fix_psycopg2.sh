#!/bin/bash
# Script para detectar y resolver problemas de compatibilidad de psycopg2

echo "🔍 Detectando problemas de psycopg2 y resolviéndolos..."

# Verificar versión de Python
PYTHON_VERSION=$(python --version 2>&1 | cut -d' ' -f2)
echo "🐍 Python version: $PYTHON_VERSION"

# Función para instalar psycopg2 con respaldo
install_psycopg2() {
    echo "📦 Instalando/actualizando psycopg2..."
    
    # Intentar instalar la versión más reciente
    if pip install psycopg2-binary==2.9.10; then
        echo "✅ psycopg2-binary 2.9.10 instalado correctamente"
        return 0
    fi
    
    # Si falla, intentar versión anterior
    echo "⚠️  Versión 2.9.10 falló, intentando 2.9.9..."
    if pip install psycopg2-binary==2.9.9; then
        echo "✅ psycopg2-binary 2.9.9 instalado correctamente"
        return 0
    fi
    
    # Si falla, intentar versión genérica
    echo "⚠️  Versión 2.9.9 falló, intentando versión genérica..."
    if pip install psycopg2-binary; then
        echo "✅ psycopg2-binary (latest) instalado correctamente"
        return 0
    fi
    
    # Si todo falla, intentar psycopg2 (no binary)
    echo "⚠️  Binary falló, intentando psycopg2 desde código fuente..."
    if pip install psycopg2; then
        echo "✅ psycopg2 instalado desde código fuente"
        return 0
    fi
    
    echo "❌ No se pudo instalar psycopg2"
    return 1
}

# Verificar si psycopg2 está instalado y funciona
test_psycopg2() {
    echo "🧪 Probando importación de psycopg2..."
    python -c "import psycopg2; print(f'✅ psycopg2 {psycopg2.__version__} funciona correctamente')" 2>/dev/null
    return $?
}

# Verificar Python 3.13 específicamente
if [[ $PYTHON_VERSION == 3.13.* ]]; then
    echo "⚠️  Python 3.13 detectado - Puede requerir versiones específicas de psycopg2"
    
    # Para Python 3.13, intentar instalar desde repositorio de desarrollo
    echo "🔧 Intentando instalación específica para Python 3.13..."
    pip install --upgrade pip
    pip install --pre psycopg2-binary || pip install psycopg2-binary==2.9.10
fi

# Instalar/actualizar psycopg2
if ! test_psycopg2; then
    install_psycopg2
    
    # Verificar nuevamente
    if test_psycopg2; then
        echo "✅ psycopg2 instalado y funcionando"
    else
        echo "❌ Error: No se pudo instalar psycopg2 funcional"
        exit 1
    fi
else
    echo "✅ psycopg2 ya está instalado y funcionando"
fi

# Ejecutar script de verificación Python
echo "🔍 Ejecutando verificación completa..."
python test_psycopg2.py

echo "✅ Verificación de psycopg2 completada"

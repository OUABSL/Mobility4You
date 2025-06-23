# utils/static_versioning.py
"""
Sistema de versionado automático de archivos estáticos
Genera hash único basado en contenido del archivo para forzar actualización
"""
import hashlib
import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List


def generate_file_hash(file_path: str) -> str:
    """Genera hash MD5 del contenido del archivo"""
    hasher = hashlib.md5()
    try:
        with open(file_path, 'rb') as f:
            hasher.update(f.read())
        return hasher.hexdigest()[:8]  # Solo primeros 8 caracteres
    except FileNotFoundError:
        return "00000000"

def version_static_file(source_path: str, static_dir: str, filename_pattern: str) -> str:
    """
    Crea versión hash del archivo estático
    
    Args:
        source_path: Ruta del archivo fuente
        static_dir: Directorio de archivos estáticos
        filename_pattern: Patrón para el nombre versionado (ej: "custom_admin_v{hash}.css")
    
    Returns:
        Nombre del archivo versionado
    """
    if not os.path.exists(source_path):
        print(f"⚠️ Archivo fuente no encontrado: {source_path}")
        return filename_pattern.format(hash="00000000")
    
    # Generar hash del contenido
    file_hash = generate_file_hash(source_path)
    
    # Crear nombre versionado
    versioned_filename = filename_pattern.format(hash=file_hash)
    versioned_path = os.path.join(static_dir, versioned_filename)
    
    # Crear directorio si no existe
    os.makedirs(os.path.dirname(versioned_path), exist_ok=True)
    
    # Copiar archivo con nuevo nombre
    shutil.copy2(source_path, versioned_path)
    
    print(f"✅ Archivo versionado: {versioned_filename}")
    return versioned_filename

def clean_old_versions(static_dir: str, pattern_prefix: str, keep_latest: int = 2):
    """Limpia versiones antiguas de archivos estáticos"""
    try:
        static_path = Path(static_dir)
        if not static_path.exists():
            return
            
        # Buscar archivos que coincidan con el patrón
        old_files = list(static_path.glob(f"{pattern_prefix}*"))
        
        # Ordenar por fecha de modificación (más reciente primero)
        old_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        # Eliminar archivos antiguos, mantener solo los más recientes
        for old_file in old_files[keep_latest:]:
            old_file.unlink()
            print(f"🗑️ Eliminado archivo antiguo: {old_file.name}")
            
    except Exception as e:
        print(f"⚠️ Error limpiando archivos antiguos: {e}")

def update_admin_references(admin_files: List[str], old_filename: str, new_filename: str):
    """Actualiza referencias en archivos admin.py"""
    for admin_file in admin_files:
        if not os.path.exists(admin_file):
            continue
            
        try:
            with open(admin_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Reemplazar referencia antigua
            if old_filename in content:
                updated_content = content.replace(old_filename, new_filename)
                
                with open(admin_file, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                
                print(f"✅ Actualizado: {admin_file}")
                
        except Exception as e:
            print(f"⚠️ Error actualizando {admin_file}: {e}")

def version_all_admin_assets():
    """Versiona todos los assets del admin"""
    # Detectar si estamos en contenedor Docker o desarrollo local
    if os.path.exists("/app"):
        base_dir = "/app"
        static_dir = "/app/staticfiles/admin"
    else:
        # Desarrollo local
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        static_dir = os.path.join(base_dir, "staticfiles", "admin")
    
    print(f"🔄 Base directory: {base_dir}")
    print(f"🔄 Static directory: {static_dir}")
    
    # Archivos a versionar
    assets = {
        "css": {
            "source": os.path.join(base_dir, "static", "admin", "css", "custom_admin.css"),
            "static_dir": os.path.join(static_dir, "css"),
            "pattern": "custom_admin_v{hash}.css",
            "clean_pattern": "custom_admin_v"
        },
        "js": {
            "vehiculos": {
                "source": os.path.join(base_dir, "static", "admin", "js", "vehiculos_admin.js"),
                "static_dir": os.path.join(static_dir, "js"),
                "pattern": "vehiculos_admin_v{hash}.js",
                "clean_pattern": "vehiculos_admin_v"
            },
            "politicas": {
                "source": os.path.join(base_dir, "static", "admin", "js", "politicas_admin.js"),
                "static_dir": os.path.join(static_dir, "js"),
                "pattern": "politicas_admin_v{hash}.js",
                "clean_pattern": "politicas_admin_v"
            },
            "usuarios": {
                "source": os.path.join(base_dir, "static", "admin", "js", "usuarios_admin.js"),
                "static_dir": os.path.join(static_dir, "js"),
                "pattern": "usuarios_admin_v{hash}.js",
                "clean_pattern": "usuarios_admin_v"
            },
            "payments": {
                "source": os.path.join(base_dir, "static", "admin", "js", "payments_admin.js"),
                "static_dir": os.path.join(static_dir, "js"),
                "pattern": "payments_admin_v{hash}.js",
                "clean_pattern": "payments_admin_v"            },
            "reservas": {
                "source": os.path.join(base_dir, "static", "admin", "js", "reservas_admin.js"),
                "static_dir": os.path.join(static_dir, "js"),
                "pattern": "reservas_admin_v{hash}.js",
                "clean_pattern": "reservas_admin_v"
            },            "comunicacion": {
                "source": os.path.join(base_dir, "static", "admin", "js", "comunicacion_admin.js"),
                "static_dir": os.path.join(static_dir, "js"),
                "pattern": "comunicacion_admin_v{hash}.js",
                "clean_pattern": "comunicacion_admin_v"
            },
            "lugares": {
                "source": os.path.join(base_dir, "static", "admin", "js", "lugares_admin.js"),
                "static_dir": os.path.join(static_dir, "js"),
                "pattern": "lugares_admin_v{hash}.js",
                "clean_pattern": "lugares_admin_v"
            }
        }
    }
    
    versioned_files = {}
    
    # Versionar CSS
    css_config = assets["css"]
    versioned_files["css"] = version_static_file(
        css_config["source"],
        css_config["static_dir"], 
        css_config["pattern"]
    )
    clean_old_versions(css_config["static_dir"], css_config["clean_pattern"])
    
    # Versionar JS
    for js_name, js_config in assets["js"].items():
        versioned_files[f"js_{js_name}"] = version_static_file(
            js_config["source"],
            js_config["static_dir"],
            js_config["pattern"] 
        )
        clean_old_versions(js_config["static_dir"], js_config["clean_pattern"])
      # Crear archivo de mapeo para uso en admin.py
    mapping_file = os.path.join(base_dir, "utils", "static_mapping.py")
    with open(mapping_file, 'w', encoding='utf-8') as f:
        f.write("# Mapeo automático de archivos estáticos versionados\n")
        f.write("# Generado automáticamente - NO EDITAR MANUALMENTE\n")
        f.write("# Última actualización: " + str(datetime.now()) + "\n\n")
        f.write("from datetime import datetime\n\n")
        f.write("VERSIONED_ASSETS = {\n")
        for key, filename in versioned_files.items():
            # Construir la ruta correcta del asset
            if key == "css":
                asset_path = f"admin/css/{filename}"
            else:
                asset_path = f"admin/js/{filename}"
            f.write(f'    "{key}": "{asset_path}",\n')
        f.write("}\n\n")
        f.write("# Función helper para obtener asset versionado\n")
        f.write("def get_versioned_asset(asset_key, fallback=None):\n")
        f.write('    """Obtiene la ruta del asset versionado o fallback si no existe"""\n')
        f.write("    return VERSIONED_ASSETS.get(asset_key, fallback or asset_key)\n\n")
        f.write("# Timestamp de generación\n")
        f.write(f"GENERATED_AT = '{datetime.now().isoformat()}'\n")
    
    print(f"✅ Mapeo de assets generado: {mapping_file}")
    
    # Actualizar referencias en archivos admin.py
    update_admin_files_with_mapping(base_dir, versioned_files)
    
    return versioned_files

def update_admin_files_with_mapping(base_dir, versioned_files):
    """Actualiza todos los archivos admin.py con las nuevas referencias"""
    admin_files = find_admin_files(base_dir)
    
    for admin_file in admin_files:
        try:
            update_single_admin_file(admin_file, versioned_files)
        except Exception as e:
            print(f"⚠️ Error actualizando {admin_file}: {e}")

def find_admin_files(base_dir):
    """Encuentra todos los archivos admin.py en el proyecto"""
    admin_files = []
    for root, dirs, files in os.walk(base_dir):
        if 'admin.py' in files:
            # Excluir directorios de cache y migraciones
            if '__pycache__' not in root and 'migrations' not in root:
                admin_files.append(os.path.join(root, 'admin.py'))
    return admin_files

def update_single_admin_file(admin_file, versioned_files):
    """Actualiza un archivo admin.py específico"""
    with open(admin_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Verificar si ya tiene importación del mapeo
    if 'from utils.static_mapping import get_versioned_asset' not in content:
        # Agregar import al inicio del archivo
        lines = content.split('\n')
        import_line = "from utils.static_mapping import get_versioned_asset"
        
        # Encontrar un buen lugar para insertar el import
        insert_index = 0
        for i, line in enumerate(lines):
            if line.startswith('from ') or line.startswith('import '):
                insert_index = i + 1
        
        lines.insert(insert_index, import_line)
        content = '\n'.join(lines)
    
    # Actualizar referencias a archivos CSS/JS
    updated = False
    
    # Reemplazar referencias CSS
    if 'css' in versioned_files:
        css_pattern = r'"admin/css/custom_admin[^"]*\.css"'
        new_css = f'"admin/css/{versioned_files["css"]}"'
        if re.search(css_pattern, content):
            content = re.sub(css_pattern, new_css, content)
            updated = True
    
    # Reemplazar referencias JS
    for js_key, js_file in versioned_files.items():
        if js_key.startswith('js_'):
            app_name = js_key.replace('js_', '')
            js_pattern = rf'"admin/js/{app_name}_admin[^"]*\.js"'
            new_js = f'"admin/js/{js_file}"'
            if re.search(js_pattern, content):
                content = re.sub(js_pattern, new_js, content)
                updated = True
    
    # Guardar archivo si hubo cambios
    if updated:
        with open(admin_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Actualizado: {admin_file}")

if __name__ == "__main__":
    print("🔄 Iniciando versionado de assets...")
    versioned = version_all_admin_assets()
    print("✅ Versionado completado!")
    for asset, filename in versioned.items():
        print(f"  {asset}: {filename}")

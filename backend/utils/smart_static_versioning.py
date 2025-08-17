# utils/smart_static_versioning.py
"""
Sistema de versionado automático inteligente de archivos estáticos
Previene errores de referencias rotas y automatiza completamente el proceso
"""
import hashlib
import logging
import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

class SmartStaticVersioning:
    """
    Sistema inteligente de versionado de archivos estáticos
    - Auto-detecta archivos estáticos
    - Genera versiones automáticamente
    - Actualiza todas las referencias
    - Mantiene fallbacks seguros
    """
    
    def __init__(self, base_dir: str = None):
        # Detectar entorno automáticamente
        if base_dir is None:
            if os.path.exists("/app"):
                self.base_dir = "/app"
                self.is_docker = True
            else:
                self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                self.is_docker = False
        else:
            self.base_dir = base_dir
            self.is_docker = "/app" in base_dir
            
        self.static_dir = os.path.join(self.base_dir, "staticfiles")
        self.admin_static_dir = os.path.join(self.static_dir, "admin")
        self.mapping_file = os.path.join(self.base_dir, "utils", "static_mapping.py")
        
        # Configuración de archivos estáticos
        self.static_files_config = {
            "css": {
                "custom_admin": {
                    "source_pattern": "admin/css/custom_admin.css",
                    "version_pattern": "admin/css/custom_admin.{hash}.css",
                    "fallback": "admin/css/custom_admin.css",
                    "mapping_key": "css"
                }
            },
            "js": {
                "vehiculos_admin": {
                    "source_pattern": "admin/js/vehiculos_admin.js", 
                    "version_pattern": "admin/js/vehiculos_admin_v{hash}.js",
                    "fallback": "admin/js/vehiculos_admin.js",
                    "mapping_key": "js_vehiculos"
                },
                "politicas_admin": {
                    "source_pattern": "admin/js/politicas_admin.js",
                    "version_pattern": "admin/js/politicas_admin_v{hash}.js", 
                    "fallback": "admin/js/politicas_admin.js",
                    "mapping_key": "js_politicas"
                },
                "usuarios_admin": {
                    "source_pattern": "admin/js/usuarios_admin.js",
                    "version_pattern": "admin/js/usuarios_admin_v{hash}.js",
                    "fallback": "admin/js/usuarios_admin.js", 
                    "mapping_key": "js_usuarios"
                },
                "payments_admin": {
                    "source_pattern": "admin/js/payments_admin.js",
                    "version_pattern": "admin/js/payments_admin_v{hash}.js",
                    "fallback": "admin/js/payments_admin.js",
                    "mapping_key": "js_payments"
                },
                "reservas_admin": {
                    "source_pattern": "admin/js/reservas_admin.js", 
                    "version_pattern": "admin/js/reservas_admin_v{hash}.js",
                    "fallback": "admin/js/reservas_admin.js",
                    "mapping_key": "js_reservas"
                },
                "comunicacion_admin": {
                    "source_pattern": "admin/js/comunicacion_admin.js",
                    "version_pattern": "admin/js/comunicacion_admin_v{hash}.js", 
                    "fallback": "admin/js/comunicacion_admin.js",
                    "mapping_key": "js_comunicacion"
                },
                "lugares_admin": {
                    "source_pattern": "admin/js/lugares_admin.js",
                    "version_pattern": "admin/js/lugares_admin_v{hash}.js",
                    "fallback": "admin/js/lugares_admin.js", 
                    "mapping_key": "js_lugares"
                }
            }
        }
        
    def generate_file_hash(self, file_path: str) -> str:
        """Genera hash MD5 del contenido del archivo"""
        try:
            hasher = hashlib.md5()
            with open(file_path, 'rb') as f:
                hasher.update(f.read())
            return hasher.hexdigest()[:8]
        except FileNotFoundError:
            logger.warning(f"Archivo no encontrado: {file_path}")
            return "fallback"
        except Exception as e:
            logger.error(f"Error generando hash para {file_path}: {e}")
            return "fallback"
    
    def find_existing_static_files(self) -> Dict[str, str]:
        """
        Busca automáticamente archivos estáticos existentes
        Retorna un diccionario con las rutas encontradas
        """
        found_files = {}
        
        for file_type, files_config in self.static_files_config.items():
            for file_name, config in files_config.items():
                # Buscar archivo fuente
                source_path = os.path.join(self.static_dir, config["source_pattern"])
                
                if os.path.exists(source_path):
                    found_files[config["mapping_key"]] = source_path
                    logger.info(f"✅ Encontrado: {source_path}")
                else:
                    # Buscar archivos ya versionados
                    base_dir = os.path.dirname(os.path.join(self.static_dir, config["source_pattern"]))
                    if os.path.exists(base_dir):
                        pattern = os.path.basename(config["source_pattern"]).replace(".css", "*.css").replace(".js", "*.js")
                        for existing_file in Path(base_dir).glob(pattern):
                            if existing_file.is_file():
                                relative_path = str(existing_file.relative_to(Path(self.static_dir)))
                                found_files[config["mapping_key"]] = relative_path
                                logger.info(f"🔍 Archivo versionado encontrado: {relative_path}")
                                break
                    
                    if config["mapping_key"] not in found_files:
                        logger.warning(f"⚠️ No encontrado: {source_path}")
                        found_files[config["mapping_key"]] = config["fallback"]
        
        return found_files
    
    def create_versioned_file(self, source_path: str, config: dict) -> Tuple[str, bool]:
        """
        Crea una versión hash del archivo estático
        Retorna (ruta_versionada, exito)
        """
        try:
            if not os.path.exists(source_path):
                logger.warning(f"Archivo fuente no existe: {source_path}")
                return config["fallback"], False
            
            # Generar hash
            file_hash = self.generate_file_hash(source_path)
            
            # Crear nombre versionado
            versioned_name = config["version_pattern"].format(hash=file_hash)
            versioned_path = os.path.join(self.static_dir, versioned_name)
            
            # Crear directorios si no existen
            os.makedirs(os.path.dirname(versioned_path), exist_ok=True)
            
            # Copiar archivo
            shutil.copy2(source_path, versioned_path)
            
            logger.info(f"✅ Archivo versionado creado: {versioned_name}")
            return versioned_name, True
            
        except Exception as e:
            logger.error(f"Error creando archivo versionado: {e}")
            return config["fallback"], False
    
    def generate_mapping_file(self, file_mappings: Dict[str, str]) -> bool:
        """Genera el archivo static_mapping.py con las rutas correctas"""
        try:
            template = '''# Mapeo automático de archivos estáticos versionados
# Generado automáticamente - NO EDITAR MANUALMENTE
# Última actualización: {timestamp}

from datetime import datetime

VERSIONED_ASSETS = {{
{assets}
}}

# Función helper para obtener asset versionado
def get_versioned_asset(asset_key, fallback=None):
    """Obtiene la ruta del asset versionado o fallback si no existe"""
    return VERSIONED_ASSETS.get(asset_key, fallback or asset_key)

# Timestamp de generación
GENERATED_AT = '{iso_timestamp}'

# Función de auto-validación
def validate_assets():
    """Valida que todos los assets existen en el sistema de archivos"""
    import os
    from django.conf import settings
    
    errors = []
    static_root = getattr(settings, 'STATIC_ROOT', None) or getattr(settings, 'STATICFILES_DIRS', [''])[0]
    
    for key, path in VERSIONED_ASSETS.items():
        full_path = os.path.join(static_root, path)
        if not os.path.exists(full_path):
            errors.append(f"Asset missing: {{key}} -> {{path}}")
    
    return errors

# Función de auto-reparación
def auto_repair_assets():
    """Auto-repara assets faltantes usando fallbacks"""
    from utils.smart_static_versioning import SmartStaticVersioning
    
    versioning = SmartStaticVersioning()
    return versioning.auto_version_all_files()
'''
            
            # Formatear assets
            assets_lines = []
            for key, path in file_mappings.items():
                assets_lines.append(f'    "{key}": "{path}",')
            
            assets_str = '\n'.join(assets_lines)
            
            # Generar contenido final
            content = template.format(
                timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f"),
                iso_timestamp=datetime.now().isoformat(),
                assets=assets_str
            )
            
            # Escribir archivo
            with open(self.mapping_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            logger.info(f"✅ Archivo de mapeo generado: {self.mapping_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error generando archivo de mapeo: {e}")
            return False
    
    def clean_old_versions(self, keep_latest: int = 2):
        """Limpia versiones antiguas de archivos estáticos"""
        try:
            for file_type, files_config in self.static_files_config.items():
                for file_name, config in files_config.items():
                    base_dir = os.path.dirname(os.path.join(self.static_dir, config["source_pattern"]))
                    if not os.path.exists(base_dir):
                        continue
                    
                    # Extraer patrón de limpieza 
                    pattern_base = os.path.basename(config["version_pattern"]).split("{hash}")[0]
                    if pattern_base.endswith("_v"):
                        pattern_base = pattern_base[:-2]  # Remover "_v"
                    pattern_base += "*"
                    
                    # Buscar archivos que coincidan
                    old_files = list(Path(base_dir).glob(pattern_base))
                    old_files = [f for f in old_files if f.is_file()]
                    
                    # Ordenar por fecha de modificación
                    old_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
                    
                    # Eliminar archivos antiguos
                    for old_file in old_files[keep_latest:]:
                        old_file.unlink()
                        logger.info(f"🗑️ Eliminado: {old_file.name}")
                        
        except Exception as e:
            logger.error(f"Error limpiando archivos antiguos: {e}")
    
    def auto_version_all_files(self) -> bool:
        """
        Versiona automáticamente todos los archivos estáticos
        Proceso completamente automatizado
        """
        try:
            logger.info("🚀 Iniciando versionado automático de archivos estáticos...")
            
            # 1. Buscar archivos existentes
            existing_files = self.find_existing_static_files()
            
            # 2. Crear versiones de archivos encontrados
            versioned_mappings = {}
            
            for file_type, files_config in self.static_files_config.items():
                for file_name, config in files_config.items():
                    mapping_key = config["mapping_key"]
                    
                    if mapping_key in existing_files:
                        source_path = existing_files[mapping_key]
                        
                        # Si es una ruta relativa, convertir a absoluta
                        if not os.path.isabs(source_path):
                            source_path = os.path.join(self.static_dir, source_path)
                        
                        # Crear versión
                        versioned_path, success = self.create_versioned_file(source_path, config)
                        
                        if success:
                            versioned_mappings[mapping_key] = versioned_path
                        else:
                            versioned_mappings[mapping_key] = config["fallback"]
                            logger.warning(f"⚠️ Usando fallback para {mapping_key}: {config['fallback']}")
                    else:
                        versioned_mappings[mapping_key] = config["fallback"]
                        logger.warning(f"⚠️ Archivo no encontrado, usando fallback para {mapping_key}")
            
            # 3. Generar archivo de mapeo
            if not self.generate_mapping_file(versioned_mappings):
                logger.error("❌ Error generando archivo de mapeo")
                return False
            
            # 4. Limpiar versiones antiguas
            self.clean_old_versions()
            
            logger.info("✅ Versionado automático completado exitosamente")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error en versionado automático: {e}")
            return False
    
    def validate_current_mappings(self) -> List[str]:
        """Valida que todos los archivos del mapeo actual existen"""
        errors = []
        
        try:
            # Importar mapeo actual
            import importlib.util
            spec = importlib.util.spec_from_file_location("static_mapping", self.mapping_file)
            static_mapping = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(static_mapping)
            
            # Validar cada asset
            for key, path in static_mapping.VERSIONED_ASSETS.items():
                full_path = os.path.join(self.static_dir, path)
                if not os.path.exists(full_path):
                    errors.append(f"Asset faltante: {key} -> {path}")
                    
        except Exception as e:
            errors.append(f"Error validando mapeos: {e}")
        
        return errors


def auto_version_static_files():
    """Función de conveniencia para versionado automático"""
    versioning = SmartStaticVersioning()
    return versioning.auto_version_all_files()


def validate_static_mappings():
    """Función de conveniencia para validación"""
    versioning = SmartStaticVersioning()
    return versioning.validate_current_mappings()

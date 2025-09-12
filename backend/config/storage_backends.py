"""
Custom storage backend para B2 que evita operaciones HEAD_OBJECT problemáticas
"""

import logging

from botocore.exceptions import ClientError
from django.utils import timezone
from storages.backends.s3boto3 import S3Boto3Storage

logger = logging.getLogger(__name__)

class B2Storage(S3Boto3Storage):
    """
    Custom storage para Backblaze B2 que maneja las limitaciones específicas
    Optimizado para evitar operaciones HEAD_OBJECT que causan 403 Forbidden
    """
    
    def exists(self, name):
        """
        Override exists() para evitar HEAD_OBJECT que causa 403 en B2
        Al retornar False, Django siempre hace PUT_OBJECT directamente
        """
        # Nunca verificar existencia - simplifica el proceso y evita errores 403
        return False
    
    def size(self, name):
        """
        Override size() para manejar errores de HEAD_OBJECT gracefully
        """
        try:
            return super().size(name)
        except ClientError as e:
            if e.response['Error']['Code'] in ['403', 'Forbidden']:
                logger.warning(f"HEAD_OBJECT no permitido para {name}, retornando 0")
                return 0
            elif e.response['Error']['Code'] == '404':
                logger.info(f"Archivo {name} no encontrado")
                return 0
            raise
    
    def get_modified_time(self, name):
        """
        Override get_modified_time() para manejar errores de HEAD_OBJECT gracefully
        """
        try:
            return super().get_modified_time(name)
        except ClientError as e:
            if e.response['Error']['Code'] in ['403', 'Forbidden', '404']:
                logger.warning(f"No se puede obtener modified_time para {name}")
                # Retornar tiempo actual como fallback
                return timezone.now()
            raise
    
    def get_created_time(self, name):
        """
        Override get_created_time() para manejar errores de HEAD_OBJECT gracefully
        """
        try:
            return super().get_created_time(name)
        except ClientError as e:
            if e.response['Error']['Code'] in ['403', 'Forbidden', '404']:
                logger.warning(f"No se puede obtener created_time para {name}")
                # Retornar tiempo actual como fallback
                return timezone.now()
            raise
    
    def _save(self, name, content):
        """
        Override _save para optimizar el proceso de subida
        """
        try:
            logger.info(f"Subiendo archivo a B2: {name}")
            saved_name = super()._save(name, content)
            logger.info(f"Archivo subido exitosamente: {saved_name}")
            return saved_name
        except ClientError as e:
            logger.error(f"Error al subir {name} a B2: {e}")
            raise
        except Exception as e:
            logger.error(f"Error inesperado al subir {name}: {e}")
            raise
    
    def url(self, name):
        """
        Override url() para construir URLs públicas sin verificar existencia
        """
        try:
            return super().url(name)
        except ClientError as e:
            if e.response['Error']['Code'] in ['403', 'Forbidden']:
                # Construir URL manualmente si HEAD_OBJECT falla
                logger.warning(f"Construyendo URL manual para {name}")
                return f"{self.endpoint_url}/{self.bucket_name}/{name}"
            raise
    
    def delete(self, name):
        """
        Override delete() para manejar errores gracefully
        """
        try:
            return super().delete(name)
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                logger.info(f"Archivo {name} ya no existe, delete ignorado")
                return
            logger.error(f"Error al eliminar {name}: {e}")
            raise
    
    def listdir(self, path):
        """
        Override listdir() para manejar errores de listado
        """
        try:
            return super().listdir(path)
        except ClientError as e:
            logger.warning(f"Error listando directorio {path}: {e}")
            return [], []  # Retornar listas vacías como fallback
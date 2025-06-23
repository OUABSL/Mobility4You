1. Arrancar el entorno
docker compose --env-file docker/.env.dev -f docker/docker-compose.yml up --build


2. Acceso a las aplicaciones
Frontend (React)
URL: http://localhost
(Nginx redirige el tráfico raíz al frontend)
Desarrollo directo: http://localhost:3000
(si ejecutas npm start en la carpeta frontend fuera de Docker)
Backend (API Django)
URL: http://localhost/api/
(Por ejemplo: http://localhost/api/categorias/)
Panel de administración Django
URL: http://localhost/admin/
(Acceso protegido -> superusuario)

4. Crear un superusuario Django (primera vez)
docker compose --env-file docker/.env.dev -f docker/docker-compose.yml exec backend python manage.py createsuperuser

5. Archivos estáticos y media
Los archivos estáticos y de media se sirven automáticamente por Nginx en /static/ y /media/.
Si subes imágenes o documentos desde el admin, estarán accesibles en /media/.

6. Variables de entorno y configuración
    - Cambia entre desarrollo y producción usando los archivos .env.dev y .env.prod y la opción --env-file.
    - El backend lee su configuración de entorno automáticamente según el valor de DJANGO_ENV.

7. Parar los servicios
docker compose --env-file docker/.env.dev -f docker/docker-compose.yml down


8. Notas adicionales
- Si cambias el código del backend o frontend, deberás reconstruir los contenedores con --build.
Para ver logs de un servicio:
docker compose logs backend
docker compose logs frontend


- Para acceder a la shell del backend:
docker compose exec backend bash
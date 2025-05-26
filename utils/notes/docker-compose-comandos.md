# Comandos Docker Compose para Mobility-for-you

## Comandos generales

### Levantar todos los servicios (modo desarrollo)
```bash
docker compose --env-file ./docker/.env.dev -f ./docker/docker-compose.yml up --build --remove-orphans
```

### Levantar todos los servicios (modo producción)
```bash
docker compose --env-file ./docker/.env.prod -f ./docker/docker-compose.yml up --build --remove-orphans
```

### Detener y eliminar todos los servicios y volúmenes (dev/prod)
```bash
docker compose --env-file ./docker/.env.dev -f ./docker/docker-compose.yml down
# o para producción
# docker compose --env-file ./docker/.env.prod -f ./docker/docker-compose.yml down
```

## Migraciones Django

### Crear migraciones
```bash
docker compose exec backend python manage.py makemigrations
```

### Aplicar migraciones
```bash
docker compose exec backend python manage.py migrate
```

## Comandos sobre contenedores específicos

### Reiniciar un contenedor específico (ejemplo: backend)
```bash
docker compose restart backend
```

### Reconstruir solo un contenedor específico (ejemplo: frontend)
```bash
docker compose build frontend
```

### Acceder a la shell de un contenedor (ejemplo: backend)
```bash
docker compose exec backend bash
```

### Acceder al contenedor de la base de datos (MariaDB)
```bash
docker compose exec db mysql -u$MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE
```

## Logs

### Ver logs de un contenedor específico (ejemplo: nginx)
```bash
docker compose logs nginx
```

### Ver logs en tiempo real de todos los servicios
```bash
docker compose logs -f
```

## Otros útiles

### Parar todos los contenedores (sin eliminar volúmenes)
```bash
docker compose stop
```

### Iniciar contenedores detenidos
```bash
docker compose start
```

---

> Cambia la ruta del archivo `.env` y el nombre del servicio según el entorno o contenedor que necesites.

#!/bin/bash
set -e

echo "🚀 Building Mobility4You Backend..."

# Detectar si estamos en Render o desarrollo local
if [ "$RENDER" = "true" ] || [ -n "$RENDER_SERVICE_ID" ]; then
    echo "🌐 Detected Render environment - using optimized build..."
    # Ejecutar el script optimizado para Render
    ./build.render.sh
else
    echo "💻 Local development build..."
    
    # Install dependencies
    echo "📦 Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt

    # Collect static files
    echo "📁 Collecting static files..."
    python manage.py collectstatic --noinput

    # Run migrations
    echo "🔄 Running database migrations..."
    python manage.py makemigrations --noinput || echo "No new migrations needed"
    python manage.py migrate --noinput

    # Create superuser if specified via environment variables
    if [ "$DJANGO_SUPERUSER_USERNAME" ] && [ "$DJANGO_SUPERUSER_EMAIL" ] && [ "$DJANGO_SUPERUSER_PASSWORD" ]; then
        echo "👤 Creating superuser..."
        python manage.py setup_superuser || python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
    User.objects.create_superuser('$DJANGO_SUPERUSER_USERNAME', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')
    print('✅ Superuser created successfully')
else:
    print('✅ Superuser already exists')
"
    fi

    echo "✅ Local build completed successfully!"
fi
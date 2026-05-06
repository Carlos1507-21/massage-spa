#!/bin/bash
# ============================================
# SANACION CONSCIENTE - Deploy Script
# ============================================
# Uso: ./deploy.sh
# Requiere: flyctl instalado y logueado
# ============================================

set -euo pipefail

APP_NAME="sanacion-consciente"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🌿 Sanación Consciente ASA - Deploy Script"
echo "==========================================="

# Verificar que flyctl está instalado
if ! command -v flyctl &> /dev/null; then
    echo "❌ Error: flyctl no está instalado."
    echo "   Instálalo con: brew install flyctl"
    exit 1
fi

# Verificar login
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ Error: No estás logueado en Fly.io."
    echo "   Ejecuta: flyctl auth login"
    exit 1
fi

# Verificar que estamos en el directorio correcto
if [ ! -f "${SCRIPT_DIR}/fly.toml" ]; then
    echo "❌ Error: No se encontró fly.toml"
    echo "   Asegúrate de ejecutar este script desde la carpeta massage-spa"
    exit 1
fi

if [ ! -f "${SCRIPT_DIR}/server.js" ]; then
    echo "❌ Error: No se encontró server.js"
    echo "   Asegúrate de ejecutar este script desde la carpeta massage-spa"
    exit 1
fi

cd "${SCRIPT_DIR}"

# Verificar que la app existe en Fly
echo ""
echo "🔍 Verificando app '${APP_NAME}' en Fly.io..."
if ! flyctl apps list | grep -q "${APP_NAME}"; then
    echo "⚠️  Advertencia: La app '${APP_NAME}' no existe en tu cuenta de Fly.io."
    echo "   ¿Creaste la app con: flyctl apps create ${APP_NAME}?"
    read -p "¿Quieres continuar de todos modos? (s/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# Verificar secrets críticos
echo ""
echo "🔐 Verificando secrets configurados..."
MISSING_SECRETS=()

for SECRET in ADMIN_USERNAME ADMIN_PASSWORD_HASH SESSION_SECRET NODE_ENV DB_HOST DB_PORT DB_NAME DB_USER DB_PASS; do
    if ! flyctl secrets list --app "${APP_NAME}" 2>/dev/null | grep -q "^${SECRET}"; then
        MISSING_SECRETS+=("${SECRET}")
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo "⚠️  Secrets faltantes: ${MISSING_SECRETS[*]}"
    echo "   Estos secrets deben configurarse antes del deploy:"
    echo ""
    for SECRET in "${MISSING_SECRETS[@]}"; do
        case "$SECRET" in
            ADMIN_USERNAME)
                echo "     flyctl secrets set ADMIN_USERNAME=Mabel"
                ;;
            ADMIN_PASSWORD_HASH)
                echo "     flyctl secrets set ADMIN_PASSWORD_HASH='...bcrypt hash...'"
                ;;
            SESSION_SECRET)
                echo "     flyctl secrets set SESSION_SECRET='...string aleatorio largo...'"
                ;;
            NODE_ENV)
                echo "     flyctl secrets set NODE_ENV=production"
                ;;
            DB_*)
                echo "     flyctl secrets set ${SECRET}=...valor..."
                ;;
        esac
    done
    echo ""
    read -p "¿Quieres continuar con el deploy de todos modos? (s/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
        exit 1
    fi
else
    echo "✅ Todos los secrets críticos están configurados"
fi

# Deploy
echo ""
echo "🚀 Iniciando deploy a Fly.io..."
echo "   App: ${APP_NAME}"
echo "   Región: $(grep 'primary_region' fly.toml | awk -F"'" '{print $2}')"
echo ""

flyctl deploy --app "${APP_NAME}"

# Verificar status
echo ""
echo "📊 Verificando estado del deploy..."
sleep 3

if flyctl status --app "${APP_NAME}" | grep -q "running"; then
    echo "✅ Deploy exitoso. La app está corriendo."
    echo ""
    echo "🔗 URLs:"
    echo "   • App: https://${APP_NAME}.fly.dev"
    echo "   • Dominio (si DNS está activo): https://sanacionconsciente.cl"
    echo ""
    echo "📋 Próximos pasos sugeridos:"
    echo "   1. Abre https://${APP_NAME}.fly.dev/frontend/index.html"
    echo "   2. Prueba el formulario de reservas"
    echo "   3. Verifica el panel admin: https://${APP_NAME}.fly.dev/admin/login.html"
else
    echo "⚠️  El deploy terminó pero la app no aparece como 'running'."
    echo "   Revisa logs con: flyctl logs --app ${APP_NAME}"
fi

echo ""
echo "🎉 ¡Deploy completado!"

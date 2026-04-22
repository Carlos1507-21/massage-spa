
<?php
// ============================================
// SANACIÓN CONSCIENTE - Google Calendar Configuration
// ============================================
//
// INSTRUCCIONES PARA CONECTAR GOOGLE CALENDAR:
//
// 1. Ir a https://console.cloud.google.com/
// 2. Crear un nuevo proyecto (o seleccionar existente)
// 3. Habilitar la API de Google Calendar:
//    APIs & Services > Enable APIs and Services > Buscar "Google Calendar API" > Enable
// 4. Crear credenciales OAuth 2.0:
//    APIs & Services > Credentials > Create Credentials > OAuth client ID
//    - Tipo: Web application
//    - Nombre: Sanación Consciente Calendar
//    - Authorized redirect URIs: https://tudominio.com/backend/api/google-calendar.php?action=callback
//    - (Para desarrollo local: http://localhost/massage-spa/backend/api/google-calendar.php?action=callback)
// 5. Descargar el JSON de credenciales (client_secret_xxx.json)
// 6. Copiar aquí los valores de "client_id" y "client_secret"
// 7. Actualizar REDIRECT_URI si es necesario
// 8. Ir a OAuth consent screen y agregar el dominio/localhost como usuario de prueba
//
// ============================================

// --- CREDENCIALES DE GOOGLE (rellenar cuando se tengan) ---
// Puedes obtenerlas del archivo client_secret_xxx.json descargado de Google Cloud Console

define('GOOGLE_CLIENT_ID',     $_ENV['GOOGLE_CLIENT_ID']     ?? 'TU_CLIENT_ID_AQUI');
define('GOOGLE_CLIENT_SECRET', $_ENV['GOOGLE_CLIENT_SECRET'] ?? 'TU_CLIENT_SECRET_AQUI');

// --- CONFIGURACIÓN DE REDIRECCIONAMIENTO ---
// Debe coincidir EXACTAMENTE con lo configurado en Google Cloud Console
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host     = $_SERVER['HTTP_HOST'] ?? 'localhost';
$script   = dirname($_SERVER['SCRIPT_NAME'] ?? '/backend/api/google-calendar.php');
$defaultRedirectUri = $protocol . '://' . $host . $script . '/google-calendar.php?action=callback';

define('GOOGLE_REDIRECT_URI',  $_ENV['GOOGLE_REDIRECT_URI']  ?? $defaultRedirectUri);

// --- SCOPES (permisos) ---
// calendar.events = crear/editar/eliminar eventos
// calendar.readonly = solo leer (si solo quieres sincronización unidireccional)
define('GOOGLE_CALENDAR_SCOPES', 'https://www.googleapis.com/auth/calendar.events');

// --- CONFIGURACIÓN DEL CALENDARIO ---
// ID del calendario donde se crearán los eventos.
// 'primary' = calendario principal de la cuenta de Google.
// O puedes usar un calendario específico, ej: 'abc123@group.calendar.google.com'
define('GOOGLE_CALENDAR_ID',   $_ENV['GOOGLE_CALENDAR_ID']   ?? 'primary');

// --- HABILITAR/DESHABILITAR INTEGRACIÓN ---
// Útil si quieres desactivar temporalmente sin borrar configuración
define('GOOGLE_CALENDAR_ENABLED', true);

// --- URLS DE LA API DE GOOGLE ---
define('GOOGLE_AUTH_URL',      'https://accounts.google.com/o/oauth2/v2/auth');
define('GOOGLE_TOKEN_URL',     'https://oauth2.googleapis.com/token');
define('GOOGLE_CALENDAR_API',  'https://www.googleapis.com/calendar/v3');

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Verifica si las credenciales están configuradas correctamente
 */
function googleCalendarIsConfigured() {
    $clientId     = GOOGLE_CLIENT_ID;
    $clientSecret = GOOGLE_CLIENT_SECRET;

    return $clientId !== 'TU_CLIENT_ID_AQUI'
        && $clientId !== ''
        && $clientSecret !== 'TU_CLIENT_SECRET_AQUI'
        && $clientSecret !== '';
}

/**
 * Genera la URL de autorización OAuth 2.0 de Google
 */
function googleCalendarGetAuthUrl($state = '') {
    $params = [
        'client_id'              => GOOGLE_CLIENT_ID,
        'redirect_uri'           => GOOGLE_REDIRECT_URI,
        'response_type'          => 'code',
        'scope'                  => GOOGLE_CALENDAR_SCOPES,
        'access_type'            => 'offline',      // Importante: obtener refresh_token
        'prompt'                 => 'consent',      // Forzar pantalla de consentimiento para obtener refresh_token
        'include_granted_scopes' => 'true',
        'state'                  => $state,
    ];

    return GOOGLE_AUTH_URL . '?' . http_build_query($params);
}

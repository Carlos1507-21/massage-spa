# 🌿 Sanación Consciente ASA - Registro de Avances del Proyecto

**Fecha última actualización:** 2026-05-02
**Estado:** Simplificado para negocio personal (una sola terapeuta a domicilio)
**Migración:** PHP → Node.js/Express + PostgreSQL ✅ COMPLETADA
**Próxima sesión:** Deploy a producción

---

## ✅ Lo que ya está construido

### 1. Estructura de carpetas (Buenas prácticas)
```
massage-spa/
├── frontend/            → Interfaz de usuario (HTML/CSS/JS)
├── backend/             → API original (PHP) - LEGACY
│   ├── 📂 api/
│   ├── 📂 models/
│   ├── 📂 config/
│   └── 📂 middleware/
├── backend-node/        → API nueva (Node.js/Express) - EN DESARROLLO
│   ├── 📂 routes/         → Endpoints REST
│   │   ├── auth.js
│   │   ├── reservations.js
│   │   ├── therapists.js
│   │   ├── business-hours.js
│   │   └── index.js
│   ├── 📂 models/         → Clases de datos (PostgreSQL)
│   │   ├── reservation.js
│   │   ├── therapist.js
│   │   └── businessHours.js
│   ├── 📂 config/         → Configuración BD
│   │   └── database.js
│   ├── 📂 middleware/     → Autenticación
│   │   └── auth.js
│   └── 📂 services/       → Servicios externos (email, calendar)
│       ├── email.js
│       └── googleCalendar.js
├── 📂 admin/              # ⭐ PANEL DE ADMIN
│   ├── login.html
│   ├── dashboard.html
│   ├── 📂 css/
│   └── 📂 js/
└── 📂 docs/               → Documentación
```

---

## 🔥 MIGRACIÓN PHP → NODE.JS (COMPLETADA)

### Estado de la migración

| Componente | Estado | Archivos |
|------------|--------|----------|
| Servidor Express | ✅ Listo | `server.js` |
| Configuración BD PostgreSQL | ✅ Listo | `backend-node/config/database.js` |
| Auth middleware | ✅ Listo | `backend-node/middleware/auth.js` |
| Rutas API | ✅ Listo | `backend-node/routes/*.js` |
| Modelo Reservation | ✅ Listo | `backend-node/models/reservation.js` |
| Modelo Therapist | ✅ Listo | `backend-node/models/therapist.js` |
| Modelo BusinessHours | ✅ Listo | `backend-node/models/businessHours.js` |
| Script init DB PostgreSQL | ✅ Listo | `backend-node/config/init-db.js` |
| Servicio Email (nodemailer) | ✅ Listo | `backend-node/services/email.js` |
| Servicio Google Calendar | 🚧 Pendiente credenciales | `backend-node/services/googleCalendar.js` |
| Ajustar URLs frontend | ✅ Listo | `frontend/js/main.js`, `admin/js/admin.js` |
| Tests de endpoints | ✅ Listo | Verificado con curl |

---

## ✅ Lo que ya está construido (detallado)

### 1. Estructura de carpetas (Buenas prácticas)

### 2. Frontend completo (100%)

**Página principal (`frontend/index.html`):**
- ✅ Header fijo con navegación suave
- ✅ Hero section con gradiente verde (#2d5a4a → #1a3d32)
- ✅ Sección de 6 servicios de masajes con precios en CLP
- ✅ Beneficios del masaje regular (4 items con iconos)
- ✅ Sección "Sobre Mí" (negocio personal)
- ✅ Testimonios (3 tarjetas)
- ✅ Formulario de reservas con horas dinámicas según disponibilidad
- ✅ Footer con redes sociales
- ✅ Botón flotante de WhatsApp

**CSS (`frontend/css/`):**
- ✅ `style.css` - Estilos completos (~550 líneas)
- ✅ `responsive.css` - Breakpoints: 992px, 768px, 480px
- ✅ Variables CSS con tema spa:
  - Verde primario: #2d5a4a
  - Dorado acento: #c9a96e
  - Fondo crema: #faf7f2
- ✅ Animaciones: fadeIn, bounce, scroll indicator
- ✅ Efectos hover en tarjetas

**JavaScript (`frontend/js/main.js`):**
- ✅ Menú hamburguesa para móvil
- ✅ Smooth scrolling entre secciones
- ✅ Header con efecto glass al hacer scroll
- ✅ Validación de formulario
- ✅ Notificaciones toast (éxito/error)
- ✅ Intersection Observer para animaciones
- ✅ Configuración de fecha mínima (mañana)
- ✅ **Horas dinámicas:** al seleccionar fecha y servicio, consulta API y muestra solo horarios disponibles

### 3. Backend API (Node.js/Express)

**Configuración (`backend-node/config/database.js`):**
- ✅ Conexión Pool PostgreSQL con opciones de seguridad
- ✅ Función `initDatabase()` para crear tablas:
  - `reservations`: id, name, email, phone, service, service_duration, reservation_date, reservation_time, message, status, timestamps
  - `contact_messages`: para futuro formulario de contacto
  - `business_hours`: horarios semanales con `service_duration` y `slot_duration`
  - `special_days`: días festivos / horarios especiales
  - `google_calendar_tokens`: tokens OAuth

**Modelo (`backend-node/models/Reservation.php`):**
- ✅ Clase con métodos:
  - `create()` - Crear reserva incluyendo `service_duration`
  - `getAll()` - Listar todas (con filtro opcional por status)
  - `getById()` - Obtener una
  - `updateStatus()` - Cambiar estado (pending/confirmed/cancelled)
  - `delete()` - Eliminar
  - `checkAvailability()` - Verificar disponibilidad considerando solapamiento de intervalos (duración + 30 min de preparación)

**API REST (`backend-node/routes/reservations.js`):**
- ✅ Endpoints funcionales:
  - GET - Listar / Obtener una
  - POST - Crear nueva (con validación y verificación de disponibilidad por intervalos)
  - PUT - Actualizar estado
  - DELETE - Eliminar
- ✅ CORS configurado
- ✅ Validación de datos
- ✅ Respuestas JSON consistentes
- ✅ Mapeo de duraciones de servicios (`SERVICE_DURATIONS`)
- ✅ Integración con Google Calendar al confirmar/cancelar

### 4. PANEL DE ADMINISTRACIÓN COMPLETO

**Estructura (`admin/`):**
- ✅ `login.html` - Página de login con diseño spa
- ✅ `dashboard.html` - Dashboard con sidebar y 4 secciones
- ✅ `css/admin.css` - Estilos completos (~900 líneas, responsive)
- ✅ `js/admin.js` - Lógica completa del panel

**Backend auth actualizado:**
- ✅ `backend-node/middleware/auth.js` - Clase de autenticación con bcrypt
- ✅ Usuario admin: `Mabel` / `204Mabel.3` (hash bcrypt)
- ✅ `backend-node/routes/auth.js` - Endpoints login/logout/check

**Características del panel:**
- 🔐 **Login seguro:**
  - Toggle mostrar/ocultar contraseña
  - Estado "Recordarme"

- 📊 **Dashboard con estadísticas:**
  - Reservas pendientes (con badge en sidebar)
  - Reservas confirmadas
  - Citas de hoy
  - Ingresos estimados del mes
  - Gráficos visuales con cards

- 📋 **Gestión de reservas completa:**
  - Tabla con todas las reservas
  - Filtros por estado: Todas/Pendientes/Confirmadas/Canceladas
  - Búsqueda en tiempo real
  - Botones de acción: Ver detalle, Confirmar, Cancelar
  - Modal con información completa del cliente

- 📅 **Próximas citas:**
  - Lista de citas de hoy + 7 días
  - Agrupadas por fecha

- 🔔 **Sistema de notificaciones:**
  - Badge con cantidad de pendientes
  - Toast notifications (éxito/error)

- 📱 **Responsive:**
  - Sidebar colapsable en móvil
  - Menú hamburguesa
  - Tabla con scroll horizontal

- 🚪 **Logout seguro**

**Secciones del panel:**
| Sección | Estado | Descripción |
|---------|--------|-------------|
| Dashboard | ✅ Listo | Resumen y estadísticas |
| Reservas | ✅ Listo | Gestión completa con tabla |
| Horarios | ✅ Listo | Configuración de horarios de atención y días festivos |
| Servicios | 🚧 Placeholder | Para futura edición de servicios |
| Reportes | 🚧 Placeholder | Para futuros reportes avanzados |
| Integraciones | ✅ Listo | Google Calendar (listo para conectar credenciales) |
| Terapeutas | ❌ Removido | No aplica: negocio personal de una sola persona |

### 5. Archivos de proyecto
- ✅ `.htaccess` - Configuración Apache + seguridad
- ✅ `.gitignore` - Exclusiones para Git
- ✅ `README.md` - Documentación completa
- ✅ `AVANCES_PROYECTO.md` - Este archivo

---

## 🔧 HORARIOS DE ATENCIÓN ACTUALIZADOS (Abril 2026)

**Configuración actual:**
| Día | Estado | Horario | Notas |
|-----|--------|---------|-------|
| Lunes | ✅ Abierto | 20:00 - 21:00 | Un solo slot de 1 hora |
| Martes | ✅ Abierto | 20:00 - 21:00 | Un solo slot de 1 hora |
| Miércoles | ✅ Abierto | 20:00 - 21:00 | Un solo slot de 1 hora |
| Jueves | ✅ Abierto | 20:00 - 21:00 | Un solo slot de 1 hora |
| Viernes | ✅ Abierto | 20:00 - 21:00 | Un solo slot de 1 hora |
| Sábado | ❌ Cerrado | — | Sin sesiones |
| Domingo | ✅ Abierto | 08:00 - 18:00 | Slots cada 60 min |

**Base de datos (`backend-node/config/init-db.js`):**
- Tabla `business_hours` actualizada con nuevos horarios
- Seed data por defecto refleja horarios reales del negocio
- Admin panel demo data (`admin/js/admin.js`) también actualizado

**Frontend (`frontend/index.html`):**
- Sección de contacto muestra horarios actualizados:
  - Lun - Vie: 20:00 - 21:00
  - Sáb: Sin sesiones
  - Dom: 08:00 - 18:00

---

## 📞 CONTACTO ACTUALIZADO

**Teléfono/WhatsApp:** +56 9 8990 8321

**Archivos actualizados:**
- `frontend/index.html` (contacto + WhatsApp float)
- `frontend/js/email-tester.js` (plantillas de email)
- `admin/js/admin.js` (demo data)
- `.env.example`
- `README.md`
- Backend legacy PHP (`backend/config/database.php`, `backend/models/WhatsApp.php`)

---

## 🎁 PROMOCIÓN DÍA DE LA MADRE (SIMPLIFICADA)

- ❌ Eliminado badge `-15%`
- ❌ Eliminado texto de "15% de descuento"
- ✅ Precio fijo: **$20.000 CLP**
- ✅ CTA actualizado a "Agendar ahora"

Archivo: `frontend/index.html` (sección `.promociones`)

---

## ⏱️ BLOQUEO DE HORARIOS: DURACIÓN + PREPARACIÓN

**Regla de negocio implementada:**
- El cliente ve la duración real del servicio (30, 45 o 60 min)
- En el calendario/backend, cada reserva bloquea: **duración + 30 min adicionales** (tiempo de preparación de sala)

**Servicios y bloqueo total:**
| Servicio | Duración visible | Bloqueo total (con prep) |
|----------|-----------------|--------------------------|
| Aromaterapia (Espalda) | 30 min | 60 min |
| Masaje Relajante (Espalda) | 45 min | 75 min |
| Aromaterapia (Cuerpo Completo) | 45 min | 75 min |
| Piedras Calientes (Espalda) | 45 min | 75 min |
| Masaje Relajante (Cuerpo Completo) | 60 min | 90 min |
| Piedras Calientes (Cuerpo Completo) | 60 min | 90 min |

**Implementación técnica:**
- `reservations` tabla incluye columna `service_duration` (minutos visibles)
- `businessHours.js`:
  - `getAvailableSlots()` filtra slots donde `serviceDuration + 30` cabe dentro del horario
  - `checkSlotAvailability()` verifica solapamiento de intervalos con PostgreSQL
- `reservation.js`:
  - `checkAvailability()` consulta SQL con solapamiento de intervalos usando `COALESCE(service_duration, 60)`
- `reservations.js` (ruta):
  - Mapeo `SERVICE_DURATIONS` para derivar duración desde el value del formulario
  - Pasa `service_duration` al crear reserva
- `main.js` (frontend):
  - Envía duración del servicio al consultar slots disponibles (`/backend/api/business-hours?slots=1&date=...&duration=...`)
  - Fallback según día de la semana si la API no responde

---

## 🔐 SEGURIDAD REFORZADA (Mayo 2026)

**Servidor (`server.js`):**
- ✅ `helmet` - Headers de seguridad (CSP, HSTS, X-Frame-Options, etc.)
- ✅ CSP endurecida: eliminado `'unsafe-inline'` de `scriptSrc` (scripts inline movidos a archivos externos)
- ✅ `express-rate-limit` - Rate limiting general (100 req / 15 min)
- ✅ Rate limiting específico para login (10 intentos / 15 min)
- ✅ **Rate limiting específico para reservas** (10 req / hora por IP)
- ✅ Session config mejorada:
  - `secure: true` en producción
  - `httpOnly: true`
  - `sameSite: 'strict'`
  - `name: 'sessionId'` (no default `connect.sid`)
- ✅ Body parser limitado a 10kb (protección contra payloads enormes)
- ✅ `trust proxy` en producción
- ✅ **Aborta startup** si falta `SESSION_SECRET` en producción
- ✅ **Error handler sanitizado**: en producción no revela `err.message` al cliente

**Autenticación (`backend-node/middleware/auth.js`):**
- ✅ Usuario: `Mabel` (nombre configurable por `ADMIN_USERNAME`)
- ✅ **Hash bcrypt movido a variable de entorno** (`ADMIN_PASSWORD_HASH`) — ya no está hardcodeado en el código fuente
- ✅ Validación: login falla si `ADMIN_PASSWORD_HASH` no está configurado
- ✅ Session destroy en logout
- ✅ **Session regeneration** tras login exitoso (previene session fixation)

**Autorización (`backend-node/routes/reservations.js`):**
- ✅ **GET /reservations ahora requiere autenticación** (`requireAuth`) — ya no expone datos personales (PII) públicamente
- ✅ Endpoints PUT/DELETE ya requerían auth, verificados

**Validación de entrada (`backend-node/routes/reservations.js`):**
- ✅ Sanitización básica de strings (`<`, `>` removidos)
- ✅ Validación de email con regex
- ✅ Validación de teléfono (formato chileno)
- ✅ Validación de fecha (formato YYYY-MM-DD y no pasada)
- ✅ Validación de servicio contra whitelist (`SERVICE_DURATIONS`)
- ✅ Validación de `id` como entero positivo en GET/PUT/DELETE
- ✅ Longitud máxima en campos (nombre 100, mensaje 500)

**Validación de entrada (`backend-node/routes/business-hours.js`):**
- ✅ Validación de fecha y hora en query params
- ✅ Validación de `duration` como entero positivo

**Google Calendar (`backend-node/routes/googleCalendar.js`):**
- ✅ **Fix XSS reflected**: parámetro `?error=` escapado antes de inyectar en HTML de respuesta
- ✅ **Fix XSS reflected**: mensajes de error en callback escapados

**Panel de administración (`admin/js/admin.js`):**
- ✅ **Eliminado backdoor de demo mode**: si el servidor no responde, ya no redirige a `dashboard.html?demo=1`
- ✅ **Eliminado skip de auth en `?demo=1`**: `checkAuth()` ahora siempre verifica sesión
- ✅ **Función `escapeHtml()` global** en admin.js para sanitizar datos antes de inyectar en DOM
- ✅ Todas las vistas de reservas (`createReservationRow`, `viewReservation`, `loadRecentReservations`, `loadUpcomingAppointments`, `createModalContent`) ahora escapan datos dinámicos

**Frontend público (`frontend/js/main.js`):**
- ✅ **Fix XSS**: `showNotification` usa `textContent` en lugar de `innerHTML` para mensajes dinámicos
- ✅ **Población de selects segura**: `updateAvailableTimes()` y `populateFallbackTimes()` usan `document.createElement('option')` en lugar de `innerHTML` con strings concatenados

**Producción:**
- ✅ `email-tester.js` removido de `frontend/index.html` (script de desarrollo)

---

## 🧹 URLs LIMPIAS (Mayo 2026)

**Problema:** Las URLs mostraban subcarpetas y extensiones en la barra de direcciones (`/frontend/index.html`, `/admin/login.html`), poco profesional.

**Solución implementada (`server.js`):**
- ✅ **Frontend servido desde raíz**: `app.use('/', express.static(...))` con `index: 'index.html'`
  - Antes: `https://sanacionconsciente.cl/frontend/index.html`
  - Ahora: `https://sanacionconsciente.cl/`
- ✅ **Redirect 301** de rutas antiguas `/frontend/*` a raíz (no rompe bookmarks)
- ✅ **Admin sin `.html`**:
  - Antes: `https://sanacionconsciente.cl/admin/login.html`
  - Ahora: `https://sanacionconsciente.cl/admin/login`
  - Rutas explícitas: `app.get('/admin/login')` sirve `admin/login.html` internamente
- ✅ **Redirect 301** de `/admin/login.html` → `/admin/login` y `/admin/dashboard.html` → `/admin/dashboard`
- ✅ **Redirect 301** de `/admin` y `/admin/` → `/admin/login`
- ✅ **Assets del admin** siguen sirviendo desde `/admin/css/`, `/admin/js/` sin cambios

**Frontend (`frontend/index.html`):**
- ✅ Links relativos (`css/style.css`, `js/main.js`, `img/...`) funcionan automáticamente desde `/`

**Admin (`admin/login.html`):**
- ✅ Link "Volver al sitio web" cambiado de `../frontend/index.html` a `/`
- ✅ Redirect post-login cambiado de `dashboard.html` a `dashboard`

**Panel (`admin/js/admin.js`):**
- ✅ `window.location.href = 'login.html'` → `'login'` (en `checkAuth()` y `initLogout()`)

---

## 📅 GOOGLE CALENDAR INTEGRACIÓN (Mayo 2026)

**Estado:** Conectado y listo para usar

**Configuración completada:**
- ✅ Proyecto creado en Google Cloud Console
- ✅ Google Calendar API habilitada
- ✅ OAuth consent screen configurada (External, test user: admin@tudominio.cl)
- ✅ OAuth 2.0 Client ID creado (Web application)
- ✅ URI de redirección: `https://sanacionconsciente.cl/backend/api/google-calendar/callback`
- ✅ Secrets seteados en Fly.io:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
  - `GOOGLE_CALENDAR_ID=primary`

**Bugs corregidos:**
- ✅ Panel admin (`admin/js/admin.js`): endpoints corregidos de `?action=...` a rutas REST (`/auth`, `/status`, `/disconnect`)
- ✅ Links de callback HTML apuntan a `/` en lugar de `/frontend/index.html`
- ✅ Botón "Conectar" ahora redirige directamente a `/backend/api/google-calendar/auth`

**Flujo de conexión:**
1. Ir a `https://sanacionconsciente.cl/admin/login`
2. Sección **Integraciones**
3. Click en **"Conectar con Google"**
4. Autorizar con la cuenta de Google
5. Listo. Las reservas nuevas se sincronizarán automáticamente.

---

## 🔧 INFRAESTRUCTURA Y DEPLOY (Mayo 2026)

**Base de datos (Supabase PostgreSQL):**
- ✅ Host: `db.oekptfbbzpqbwcfhzqdf.supabase.co`
- ✅ Base de datos inicializada con `init-db.js` (tablas: reservations, contact_messages, google_calendar_tokens, business_hours, special_days, therapists, therapist_availability, therapist_unavailable_days)
- ✅ Datos de seed insertados (horarios semanales: Lun-Vie 20:00-21:00, Sáb cerrado, Dom 08:00-18:00)

**Servidor (Fly.io):**
- ✅ App: `sanacion-consciente`
- ✅ Región: `gru` (São Paulo)
- ✅ Secrets configurados:
  - `SESSION_SECRET`
  - `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` / `GOOGLE_CALENDAR_ID`
  - `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS`
  - `NODE_ENV=production`
- ✅ Deploy automatizado con `deploy.sh`

**Verificación post-deploy:**
- ✅ Login endpoint: `POST /backend/api/auth/login` → `{"success":true}`
- ✅ Business hours endpoint: `GET /backend/api/business-hours` → devuelve horarios correctamente
- ✅ Panel de admin accesible: `https://sanacionconsciente.cl/admin/login`
- ✅ Frontend accesible: `https://sanacionconsciente.cl/`

---

## 📝 Notas importantes

- La base de datos PostgreSQL está en Supabase (host: `db.oekptfbbzpqbwcfhzqdf.supabase.co`)
- Si necesitas reconectar Google Calendar, ir a `https://sanacionconsciente.cl/admin/login` → Integraciones → Conectar con Google
- Para nuevos deploys, ejecutar `./deploy.sh` desde la carpeta `massage-spa`
- El negocio es personal: una sola terapeuta que atiende masajes en su casa

---

## 🔗 Archivos clave para recordar

| Archivo | Propósito |
|---------|-----------|
| `frontend/index.html` | Página principal del spa |
| `frontend/css/style.css` | Tema visual spa |
| `frontend/js/main.js` | Lógica del sitio público + horas dinámicas |
| `admin/login.html` | **Login del panel** |
| `admin/dashboard.html` | **Dashboard principal** |
| `admin/css/admin.css` | Estilos del panel |
| `admin/js/admin.js` | Lógica del panel |
| `backend/api/reservations` | API de reservas (Node.js) |
| `backend/api/auth` | **API de autenticación** |
| `backend/api/google-calendar` | **API de Google Calendar** |
| `backend/api/business-hours` | **API de Horarios de Atención** |
| `backend/models/reservation.js` | Modelo de datos con service_duration |
| `backend/models/businessHours.js` | **Modelo de Horarios con slots** |
| `backend/middleware/auth.js` | **Middleware de auth** (usuario Mabel) |
| `backend/services/googleCalendar.js` | **Servicio de Google Calendar** |
| `backend/config/init-db.js` | **Inicialización BD con horarios actualizados** |
| `server.js` | **Servidor Express con seguridad** |
| `deploy.sh` | **Script de deploy a Fly.io** |

---

**Creado por:** Claude Code
**Guardar en:** `/Users/carlos/Proyectos Web/Proyecto Mabel/massage-spa/AVANCES_PROYECTO.md`
**Actualizar:** Cada vez que haya cambios significativos

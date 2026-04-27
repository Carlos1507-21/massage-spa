
# 🌿 Sanación Consciente ASA - Sistema de Reservas

Sistema web completo para la gestión de reservas de un spa de masajes terapéuticos.

## 📁 Estructura del Proyecto

```
massage-spa/
├── 📂 frontend/              # Interfaz de usuario
│   ├── 📂 css/
│   │   ├── style.css       # Estilos principales
│   │   └── responsive.css  # Estilos responsive
│   ├── 📂 js/
│   │   └── main.js         # JavaScript del frontend
│   ├── 📂 assets/
│   │   └── images/         # Imágenes
│   └── index.html          # Página principal
│
├── 📂 backend/             # API y lógica del servidor
│   ├── 📂 api/
│   │   └── reservations.php    # API REST para reservas
│   ├── 📂 models/
│   │   └── Reservation.php      # Modelo de datos
│   ├── 📂 config/
│   │   └── database.php         # Configuración de BD
│   └── 📂 middleware/          # (para futuro auth)
│
├── 📂 docs/                # Documentación
├── .htaccess             # Configuración Apache
├── .gitignore
└── README.md
```

## 🚀 Instalación

### Requisitos
- PHP 7.4+
- MySQL 5.7+
- Servidor web (Apache/Nginx)

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tuusuario/sanacion-consciente.git
   cd massage-spa
   ```

2. **Configurar la base de datos**
   - Crear base de datos: `sanacion_consciente`
   - Importar esquema desde `backend/config/database.php`

3. **Configurar variables de entorno**
   ```bash
   cp backend/config/.env.example backend/config/.env
   ```
   Editar con tus credenciales de BD

4. **Configurar servidor web**
   - Apuntar DocumentRoot a la carpeta `frontend/`
   - Configurar PHP para procesar archivos en `backend/api/`

5. **Acceder**
   - Frontend: `http://localhost/`
   - API: `http://localhost/../backend/api/reservations.php`

## 📋 Características

### Frontend
- ✅ Diseño responsive (móvil, tablet, desktop)
- ✅ Animaciones suaves y scroll behavior
- ✅ Formulario de reservas con validación
- ✅ Notificaciones toast
- ✅ Intersection Observer para animaciones

### Backend
- ✅ API RESTful para reservas
- ✅ CRUD completo de reservas
- ✅ Validación de datos
- ✅ Verificación de disponibilidad
- ✅ PDO para seguridad (prepared statements)

## 🔌 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/backend/api/reservations.php` | Listar todas las reservas |
| GET | `/backend/api/reservations.php?id=1` | Obtener reserva específica |
| POST | `/backend/api/reservations.php` | Crear nueva reserva |
| PUT | `/backend/api/reservations.php` | Actualizar estado |
| DELETE | `/backend/api/reservations.php?id=1` | Eliminar reserva |

### Ejemplo POST
```json
{
  "name": "María González",
  "email": "maria@email.com",
  "phone": "+56912345678",
  "service": "relajante",
  "date": "2025-04-20",
  "time": "15:00",
  "message": "Primera vez, tengo dolor de espalda"
}
```

## 🎨 Personalización

### Colores
Editar en `frontend/css/style.css`:
```css
:root {
    --primary-color: #2d5a4a;    /* Verde spa */
    --accent-color: #c9a96e;      /* Dorado */
    /* ... */
}
```

### Servicios
Editar en `frontend/index.html` la sección `#servicios`

## 📱 Responsive Breakpoints

- Desktop: > 992px
- Tablet: 768px - 992px
- Mobile: < 768px
- Small Mobile: < 480px

## 🔒 Seguridad

- Prepared statements (PDO)
- Validación de entrada
- Sanitización de output
- Headers de seguridad (CSP, XSS)
- Protección de archivos .htaccess

## 📝 Licencia

MIT License - Proyecto educativo

---

Hecho con 💚 para tu bienestar

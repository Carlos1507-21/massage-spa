
// ============================================
// SANACIÓN CONSCIENTE - Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {

    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // Close menu when clicking on a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Header shadow on scroll
    const header = document.querySelector('.header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.07)';
        }

        lastScroll = currentScroll;
    });

    // Set minimum date for reservation form
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.min = tomorrow.toISOString().split('T')[0];
    }

    // Dynamic available hours based on date and service
    const serviceInput = document.getElementById('service');
    if (dateInput && serviceInput) {
        dateInput.addEventListener('change', updateAvailableTimes);
        serviceInput.addEventListener('change', updateAvailableTimes);
    }

    // Form handling
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', handleFormSubmit);
    }

    // Intersection Observer for animations
    initScrollAnimations();
});

// Service durations (minutes) — visible to client
const SERVICE_DURATIONS = {
    'relajante-espalda': 45,
    'relajante-completo': 60,
    'piedras-espalda': 45,
    'piedras-completo': 60,
    'aromaterapia-espalda': 30,
    'aromaterapia-completo': 45
};

const REGULAR_PRICES = {
    'relajante-espalda': 20000,
    'relajante-completo': 30000,
    'piedras-espalda': 30000,
    'piedras-completo': 35000,
    'aromaterapia-espalda': 25000,
    'aromaterapia-completo': 30000
};

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Fetch and populate available time slots
async function updateAvailableTimes() {
    const dateInput = document.getElementById('date');
    const serviceInput = document.getElementById('service');
    const timeSelect = document.getElementById('time');

    if (!dateInput || !serviceInput || !timeSelect) return;

    const date = dateInput.value;
    const service = serviceInput.value;

    if (!date || !service) {
        timeSelect.innerHTML = '<option value="">Selecciona hora</option>';
        timeSelect.disabled = true;
        return;
    }

    const duration = SERVICE_DURATIONS[service] || 60;
    timeSelect.disabled = true;
    timeSelect.innerHTML = '<option value="">Cargando horas...</option>';

    try {
        const response = await fetch(`/backend/api/business-hours?slots=1&date=${date}&duration=${duration}`);
        const result = await response.json();

        if (result.success && result.data && result.data.slots && result.data.slots.length > 0) {
            timeSelect.innerHTML = '';
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = 'Selecciona hora';
            timeSelect.appendChild(defaultOpt);
            result.data.slots.forEach(slot => {
                const timeLabel = slot.time.substring(0, 5);
                const opt = document.createElement('option');
                opt.value = timeLabel;
                opt.textContent = timeLabel;
                timeSelect.appendChild(opt);
            });
            timeSelect.disabled = false;
        } else {
            timeSelect.innerHTML = '';
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No hay horas disponibles';
            timeSelect.appendChild(opt);
            timeSelect.disabled = true;
        }
    } catch (error) {
        console.error('Error cargando horarios:', error);
        // Fallback: mostrar horarios genéricos según día de la semana
        populateFallbackTimes(date);
    } finally {
        updatePromoDisplay();
    }
}

// Fallback time slots based on day of week (used when API is unreachable)
function populateFallbackTimes(date) {
    const timeSelect = document.getElementById('time');
    if (!timeSelect) return;

    const day = new Date(date).getDay();
    let times = [];

    if (day >= 1 && day <= 5) {
        times = ['20:00'];
    } else if (day === 0) {
        times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    } else {
        times = [];
    }

    timeSelect.innerHTML = '';
    if (times.length > 0) {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Selecciona hora';
        timeSelect.appendChild(defaultOpt);
        times.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            timeSelect.appendChild(opt);
        });
        timeSelect.disabled = false;
    } else {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No hay horas disponibles';
        timeSelect.appendChild(opt);
        timeSelect.disabled = true;
    }
}

async function updatePromoDisplay() {
    const serviceInput = document.getElementById('service');
    const dateInput = document.getElementById('date');
    const promoInfo = document.getElementById('promoInfo');

    if (!serviceInput || !dateInput || !promoInfo) return;

    const service = serviceInput.value;
    const date = dateInput.value;

    if (!service || !date) {
        promoInfo.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`/backend/api/promotions?date=${date}&service=${service}`);
        const result = await response.json();

        if (result.success && result.data && result.data.promotions && result.data.promotions.length > 0) {
            const promo = result.data.promotions[0];
            const regular = REGULAR_PRICES[service] || 0;

            let finalPrice = promo.price;
            let discountLabel = '';

            if (promo.discount_type === 'percentage' && promo.discount_value > 0) {
                finalPrice = Math.round(regular * (1 - promo.discount_value / 100));
                discountLabel = `${promo.discount_value}% de descuento`;
            }

            const discount = regular - finalPrice;

            promoInfo.innerHTML = `
                <div style="background:#f0faf2; border-left:4px solid #4CAF7A; padding:0.75rem 1rem; border-radius:6px;">
                    <strong style="color:#2d7a4f;">${escapeHtml(promo.name)}</strong>
                    ${discountLabel ? `<span style="color:#c44d4d; font-size:0.85rem; margin-left:0.5rem;">(${escapeHtml(discountLabel)})</span>` : ''}<br>
                    <span style="text-decoration:line-through; color:#888;">$${regular.toLocaleString('es-CL')}</span>
                    <span style="color:#c44d4d; font-weight:bold; font-size:1.1rem;"> $${Number(finalPrice).toLocaleString('es-CL')} CLP</span>
                    ${discount > 0 ? `<span style="color:#4CAF7A; font-size:0.85rem;"> ¡Ahorras $${discount.toLocaleString('es-CL')}!</span>` : ''}
                </div>
            `;
            promoInfo.style.display = 'block';
        } else {
            promoInfo.style.display = 'none';
        }
    } catch (error) {
        console.error('Error cargando promoción:', error);
        promoInfo.style.display = 'none';
    }
}

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        service: document.getElementById('service').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        message: document.getElementById('message').value.trim()
    };

    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.service || !formData.date) {
        showNotification('Por favor completa todos los campos obligatorios (*)', 'error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        showNotification('Por favor ingresa un email válido', 'error');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Enviando...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/backend/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Error al crear la reserva');
        }

        // Guardar reserva en localStorage (para modo demo sin servidor)
        saveReservation(formData);

        // Simular envío de emails (si EmailTester está disponible)
        if (typeof EmailTester !== 'undefined') {
            EmailTester.simulateReservation(formData);
            console.log('📧 Revisa la consola (F12) para ver los emails enviados');
        }

        showNotification('¡Reserva solicitada con éxito! Te contactaremos pronto.', 'success');
        e.target.reset();
    } catch (error) {
        showNotification('Hubo un error. Por favor intenta de nuevo.', 'error');
        console.error('Error:', error);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Notification system
function showNotification(message, type = 'success') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    const icon = document.createElement('span');
    icon.className = 'notification-icon';
    icon.textContent = type === 'success' ? '✓' : '⚠';
    notification.appendChild(icon);

    const msgSpan = document.createElement('span');
    msgSpan.className = 'notification-message';
    msgSpan.textContent = message; // textContent evita XSS
    notification.appendChild(msgSpan);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; margin-left: auto;';
    notification.appendChild(closeBtn);

    const styles = {
        position: 'fixed',
        top: '100px',
        right: '20px',
        background: type === 'success' ? '#4CAF7A' : '#c44d4d',
        color: 'white',
        padding: '20px 25px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        zIndex: '9999',
        transform: 'translateX(400px)',
        transition: 'transform 0.3s ease',
        maxWidth: '350px'
    };

    Object.assign(notification.style, styles);

    const closeNotification = () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 300);
    };

    closeBtn.addEventListener('click', closeNotification);
    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
    });

    setTimeout(closeNotification, 5000);
}

// Scroll animations with Intersection Observer
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-visible');
            }
        });
    }, observerOptions);

    // Elements to animate
    const animateElements = document.querySelectorAll('.service-card, .benefits-list li, .testimonial-card');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Add animation class styles
const style = document.createElement('style');
style.textContent = `
    .fade-in-visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

// Guardar reserva en localStorage
function saveReservation(data) {
    const reservations = JSON.parse(localStorage.getItem('sanacion_consciente_reservations') || '[]');
    reservations.push({
        id: Date.now(),
        ...data,
        status: 'pending',
        createdAt: new Date().toISOString()
    });
    localStorage.setItem('sanacion_consciente_reservations', JSON.stringify(reservations));
}

// Exportar para uso global
window.saveReservation = saveReservation;

// Cargar horarios de atención desde la API
async function loadBusinessHours() {
    const display = document.getElementById('businessHoursDisplay');
    if (!display) return;

    try {
        const response = await fetch('/backend/api/business-hours');
        const result = await response.json();

        if (result.success && result.data && result.data.businessHours) {
            const hours = result.data.businessHours;
            const lines = [];
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

            // Lun-Vie: agrupar consecutivos con mismos horarios
            let currentGroup = null;
            const groups = [];
            for (let i = 1; i <= 5; i++) {
                const day = hours.find(h => h.day_of_week === i);
                if (day && day.is_open) {
                    const timeStr = `${day.open_time.substring(0, 5)} - ${day.close_time.substring(0, 5)}`;
                    if (currentGroup && currentGroup.time === timeStr) {
                        currentGroup.endDay = days[i];
                    } else {
                        if (currentGroup) groups.push(currentGroup);
                        currentGroup = { startDay: days[i], endDay: days[i], time: timeStr };
                    }
                }
            }
            if (currentGroup) groups.push(currentGroup);
            groups.forEach(g => {
                const dayLabel = g.startDay === g.endDay ? g.startDay : `${g.startDay} - ${g.endDay}`;
                lines.push(`${dayLabel}: ${g.time}`);
            });

            // Sábado
            const sat = hours.find(h => h.day_of_week === 6);
            lines.push(sat && sat.is_open
                ? `Sáb: ${sat.open_time.substring(0, 5)} - ${sat.close_time.substring(0, 5)}`
                : 'Sáb: Sin sesiones');

            // Domingo
            const sun = hours.find(h => h.day_of_week === 0);
            lines.push(sun && sun.is_open
                ? `Dom: ${sun.open_time.substring(0, 5)} - ${sun.close_time.substring(0, 5)}`
                : 'Dom: Sin sesiones');

            display.innerHTML = lines.join('<br>');
        } else {
            display.innerHTML = 'Lun - Vie: 20:00 - 21:00<br>Sáb: Sin sesiones<br>Dom: 08:00 - 18:00';
        }
    } catch (error) {
        console.error('Error cargando horarios:', error);
        display.innerHTML = 'Lun - Vie: 20:00 - 21:00<br>Sáb: Sin sesiones<br>Dom: 08:00 - 18:00';
    }
}

// Cargar horarios al iniciar
loadBusinessHours();

console.log('🌿 Sanación Consciente ASA - Bienvenido a tu oasis de tranquilidad');
console.log('💡 Tip: Usa EmailTester.getInbox() en la consola para ver emails enviados');

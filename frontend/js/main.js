
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
            const options = result.data.slots.map(slot => {
                const timeLabel = slot.time.substring(0, 5);
                return `<option value="${timeLabel}">${timeLabel}</option>`;
            }).join('');
            timeSelect.innerHTML = '<option value="">Selecciona hora</option>' + options;
            timeSelect.disabled = false;
        } else {
            timeSelect.innerHTML = '<option value="">No hay horas disponibles</option>';
            timeSelect.disabled = true;
        }
    } catch (error) {
        console.error('Error cargando horarios:', error);
        // Fallback: mostrar horarios genéricos según día de la semana
        populateFallbackTimes(date);
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

    if (times.length > 0) {
        const options = times.map(t => `<option value="${t}">${t}</option>`).join('');
        timeSelect.innerHTML = '<option value="">Selecciona hora</option>' + options;
        timeSelect.disabled = false;
    } else {
        timeSelect.innerHTML = '<option value="">No hay horas disponibles</option>';
        timeSelect.disabled = true;
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

console.log('🌿 Sanación Consciente ASA - Bienvenido a tu oasis de tranquilidad');
console.log('💡 Tip: Usa EmailTester.getInbox() en la consola para ver emails enviados');

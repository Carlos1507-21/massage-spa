
// ============================================
// SANACIÓN CONSCIENTE - Admin Panel JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();

    // Initialize all components
    initNavigation();
    initStats();
    initReservations();
    initModal();
    initLogout();
    initSearch();
    initIntegrations();
    initBusinessHours();
    initTherapists();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('../backend/api/auth.php?action=check');
        const data = await response.json();

        if (!data.success) {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        // En desarrollo, permitir acceso
        // window.location.href = 'login.html';
    }
}

// Navigation
function initNavigation() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const navLinks = document.querySelectorAll('.sidebar-nav a');

    // Mobile menu toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Section navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');

            if (sectionId) {
                // Update active nav
                document.querySelectorAll('.sidebar-nav li').forEach(li => {
                    li.classList.remove('active');
                });
                link.parentElement.classList.add('active');

                // Show section
                showSection(sectionId);

                // Close mobile menu
                sidebar.classList.remove('active');
            }
        });
    });

    // Filter change
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            loadReservations();
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadReservations();
            showNotification('Datos actualizados', 'success');
        });
    }
}

// Show section
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// Initialize stats
async function initStats() {
    await updateStats();
}

// Update statistics
async function updateStats() {
    try {
        const response = await fetch('../backend/api/reservations.php');
        const data = await response.json();

        if (data.success && data.data) {
            const reservations = data.data;

            // Count by status
            const pending = reservations.filter(r => r.status === 'pending').length;
            const confirmed = reservations.filter(r => r.status === 'confirmed').length;

            // Today's appointments
            const today = new Date().toISOString().split('T')[0];
            const todayCount = reservations.filter(r =>
                r.reservation_date === today && r.status !== 'cancelled'
            ).length;

            // Update DOM
            document.getElementById('statPending').textContent = pending;
            document.getElementById('statConfirmed').textContent = confirmed;
            document.getElementById('statToday').textContent = todayCount;
            document.getElementById('pendingCount').textContent = pending;

            // Simulated revenue (en producción calcular desde BD)
            const revenue = confirmed * 50000; // Promedio $50.000
            document.getElementById('statRevenue').textContent = '$' + revenue.toLocaleString('es-CL');

            // Update notifications
            document.getElementById('notifBadge').textContent = pending;

            // Load recent reservations
            loadRecentReservations(reservations.slice(0, 5));
            loadUpcomingAppointments(reservations);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        // Demo data para pruebas
        loadDemoData();
    }
}

// Load recent reservations for dashboard
function loadRecentReservations(reservations) {
    const container = document.getElementById('recentReservations');
    if (!container) return;

    if (!reservations || reservations.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay reservas recientes</div>';
        return;
    }

    const html = reservations.map(r => {
        const statusClass = r.status === 'pending' ? 'pending' : 'confirmed';
        const statusText = r.status === 'pending' ? 'Pendiente' : 'Confirmada';

        return `
            <div class="recent-item">
                <div class="recent-icon">${getServiceIcon(r.service)}</div>
                <div class="recent-info">
                    <h4>${r.name}</h4>
                    <p>${formatServiceName(r.service)} • ${formatDate(r.reservation_date)}</p>
                </div>
                <span class="recent-status ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// Load upcoming appointments
function loadUpcomingAppointments(reservations) {
    const container = document.getElementById('upcomingAppointments');
    if (!container) return;

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const upcoming = reservations.filter(r => {
        const rDate = new Date(r.reservation_date);
        return rDate >= today && rDate <= nextWeek && r.status !== 'cancelled';
    }).slice(0, 5);

    if (upcoming.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay citas próximas</div>';
        return;
    }

    const html = upcoming.map(r => {
        const time = r.reservation_time ? r.reservation_time.substring(0, 5) : '10:00';
        const ampm = parseInt(time.split(':')[0]) >= 12 ? 'PM' : 'AM';

        return `
            <div class="appointment-item">
                <div class="appointment-time">
                    <span class="time">${time}</span>
                    <span class="ampm">${ampm}</span>
                </div>
                <div class="appointment-details">
                    <h4>${r.name}</h4>
                    <p>${formatServiceName(r.service)}</p>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// Initialize reservations table
async function initReservations() {
    await loadReservations();
}

// Load reservations
async function loadReservations() {
    const tbody = document.getElementById('reservationsTableBody');
    const emptyState = document.getElementById('emptyReservations');
    const table = document.getElementById('reservationsTable');

    if (!tbody) return;

    // Show loading
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;">Cargando...</td></tr>';

    try {
        const filter = document.getElementById('filterStatus')?.value || 'all';
        const url = filter === 'all'
            ? '../backend/api/reservations.php'
            : `../backend/api/reservations.php?status=${filter}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.data) {
            const reservations = data.data;

            if (reservations.length === 0) {
                tbody.innerHTML = '';
                table.style.display = 'none';
                emptyState.style.display = 'block';
            } else {
                table.style.display = 'table';
                emptyState.style.display = 'none';
                tbody.innerHTML = reservations.map(r => createReservationRow(r)).join('');

                // Add event listeners to action buttons
                document.querySelectorAll('.btn-view').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = e.target.closest('button').dataset.id;
                        viewReservation(id);
                    });
                });

                document.querySelectorAll('.btn-confirm').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = e.target.closest('button').dataset.id;
                        updateReservationStatus(id, 'confirmed');
                    });
                });

                document.querySelectorAll('.btn-cancel').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = e.target.closest('button').dataset.id;
                        updateReservationStatus(id, 'cancelled');
                    });
                });
            }
        }
    } catch (error) {
        console.error('Error loading reservations:', error);
        // Demo data
        loadDemoReservations();
    }
}

// Create reservation row HTML
function createReservationRow(r) {
    const statusClass = `status-${r.status}`;
    const statusText = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmada',
        'cancelled': 'Cancelada'
    }[r.status] || r.status;

    const time = r.reservation_time ? r.reservation_time.substring(0, 5) : '--:--';

    return `
        <tr>
            <td>#${r.id}</td>
            <td><strong>${r.name}</strong></td>
            <td>${formatServiceName(r.service)}</td>
            <td>${formatDate(r.reservation_date)}</td>
            <td>${time}</td>
            <td>
                <div>${r.email}</div>
                <small>${r.phone}</small>
            </td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="actions">
                    <button class="btn-action btn-view" data-id="${r.id}" title="Ver detalle">👁️</button>
                    ${r.status === 'pending' ? `
                        <button class="btn-action btn-confirm" data-id="${r.id}" title="Confirmar">✓</button>
                    ` : ''}
                    ${r.status !== 'cancelled' ? `
                        <button class="btn-action btn-cancel" data-id="${r.id}" title="Cancelar">✕</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

// View reservation detail
async function viewReservation(id) {
    try {
        const response = await fetch(`../backend/api/reservations.php?id=${id}`);
        const data = await response.json();

        if (data.success && data.data) {
            const r = data.data;
            const time = r.reservation_time ? r.reservation_time.substring(0, 5) : '--:--';

            const html = `
                <div class="detail-row">
                    <div class="detail-label">ID:</div>
                    <div class="detail-value">#${r.id}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Cliente:</div>
                    <div class="detail-value">${r.name}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${r.email}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Teléfono:</div>
                    <div class="detail-value">${r.phone}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Servicio:</div>
                    <div class="detail-value">${formatServiceName(r.service)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Fecha:</div>
                    <div class="detail-value">${formatDate(r.reservation_date)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Hora:</div>
                    <div class="detail-value">${time}</div>
                </div>
                ${r.message ? `
                <div class="detail-row">
                    <div class="detail-label">Mensaje:</div>
                    <div class="detail-value">${r.message}</div>
                </div>
                ` : ''}
                <div class="detail-row">
                    <div class="detail-label">Estado:</div>
                    <div class="detail-value">
                        <span class="status-badge status-${r.status}">
                            ${r.status === 'pending' ? 'Pendiente' : r.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                        </span>
                    </div>
                </div>
            `;

            document.getElementById('modalBody').innerHTML = html;

            // Configurar botón confirmar del modal
            const confirmBtn = document.getElementById('modalConfirm');
            if (r.status === 'pending') {
                confirmBtn.style.display = 'block';
                confirmBtn.onclick = () => {
                    updateReservationStatus(r.id, 'confirmed');
                    closeModal();
                };
            } else {
                confirmBtn.style.display = 'none';
            }

            openModal();
        }
    } catch (error) {
        console.error('Error viewing reservation:', error);
        showNotification('Error al cargar detalles', 'error');
    }
}

// Update reservation status
async function updateReservationStatus(id, status) {
    try {
        const response = await fetch('../backend/api/reservations.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Reserva ${status === 'confirmed' ? 'confirmada' : 'cancelada'} exitosamente`, 'success');
            loadReservations();
            updateStats();
        } else {
            showNotification(data.message || 'Error al actualizar', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Modal functions
function initModal() {
    const modal = document.getElementById('reservationModal');
    const closeBtn = document.querySelector('.modal-close');
    const cancelBtn = document.getElementById('modalCancel');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

function openModal() {
    document.getElementById('reservationModal').classList.add('active');
}

function closeModal() {
    document.getElementById('reservationModal').classList.remove('active');
}

// Logout
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('../backend/api/auth.php?action=logout');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = 'login.html';
            }
        });
    }
}

// Search functionality
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            // En producción implementar búsqueda real
            console.log('Searching:', searchInput.value);
        }, 300));
    }
}

// Helper functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatServiceName(service) {
    const names = {
        'relajante': 'Masaje Relajante',
        'terapeutico': 'Masaje Terapéutico',
        'aromaterapia': 'Aromaterapia',
        'piedras': 'Piedras Calientes',
        'reflexologia': 'Reflexología Podal',
        'prenatal': 'Masaje Prenatal'
    };
    return names[service] || service;
}

function getServiceIcon(service) {
    const icons = {
        'relajante': '🌿',
        'terapeutico': '🔥',
        'aromaterapia': '🌸',
        'piedras': '🪨',
        'reflexologia': '👣',
        'prenatal': '🤰'
    };
    return icons[service] || '📅';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification notification-${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Demo data para pruebas sin backend
function loadDemoData() {
    document.getElementById('statPending').textContent = '3';
    document.getElementById('statConfirmed').textContent = '12';
    document.getElementById('statToday').textContent = '2';
    document.getElementById('statRevenue').textContent = '$600.000';
    document.getElementById('pendingCount').textContent = '3';
    document.getElementById('notifBadge').textContent = '3';

    // Demo recent reservations
    const demoReservations = [
        { id: 1, name: 'María González', service: 'terapeutico', reservation_date: '2025-04-15', status: 'pending' },
        { id: 2, name: 'Carlos Mendoza', service: 'relajante', reservation_date: '2025-04-14', status: 'confirmed' },
        { id: 3, name: 'Laura Gutiérrez', service: 'prenatal', reservation_date: '2025-04-16', status: 'pending' }
    ];

    loadRecentReservations(demoReservations);
    loadUpcomingAppointments(demoReservations);
}

function loadDemoReservations() {
    const tbody = document.getElementById('reservationsTableBody');
    const emptyState = document.getElementById('emptyReservations');
    const table = document.getElementById('reservationsTable');

    if (!tbody) return;

    const demoData = [
        { id: 1, name: 'María González', email: 'maria@email.com', phone: '+56912345678', service: 'terapeutico', reservation_date: '2025-04-15', reservation_time: '15:00', status: 'pending' },
        { id: 2, name: 'Carlos Mendoza', email: 'carlos@email.com', phone: '+56987654321', service: 'relajante', reservation_date: '2025-04-14', reservation_time: '10:30', status: 'confirmed' },
        { id: 3, name: 'Laura Gutiérrez', email: 'laura@email.com', phone: '+56955544433', service: 'prenatal', reservation_date: '2025-04-16', reservation_time: '14:00', status: 'pending' },
        { id: 4, name: 'Ana Silva', email: 'ana@email.com', phone: '+56999988877', service: 'aromaterapia', reservation_date: '2025-04-18', reservation_time: '11:00', status: 'confirmed' },
        { id: 5, name: 'Pedro Ruiz', email: 'pedro@email.com', phone: '+56911122233', service: 'piedras', reservation_date: '2025-04-20', reservation_time: '16:30', status: 'pending' }
    ];

    table.style.display = 'table';
    emptyState.style.display = 'none';
    tbody.innerHTML = demoData.map(r => createReservationRow(r)).join('');

    // Add event listeners
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('button').dataset.id;
            const r = demoData.find(item => item.id == id);
            if (r) {
                document.getElementById('modalBody').innerHTML = createModalContent(r);
                document.getElementById('modalConfirm').style.display = r.status === 'pending' ? 'block' : 'none';
                openModal();
            }
        });
    });

    document.querySelectorAll('.btn-confirm').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('button').dataset.id;
            showNotification('Reserva confirmada (demo)', 'success');
        });
    });

    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('button').dataset.id;
            showNotification('Reserva cancelada (demo)', 'success');
        });
    });
}

// ============================================
// INTEGRACIONES
// ============================================

function initIntegrations() {
    loadCalendarStatus();

    const connectBtn = document.getElementById('connectCalendarBtn');
    const disconnectBtn = document.getElementById('disconnectCalendarBtn');
    const syncAllBtn = document.getElementById('syncAllBtn');

    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('../backend/api/google-calendar.php?action=auth-url', {
                    method: 'POST',
                    credentials: 'include'
                });
                const data = await response.json();

                if (data.success && data.auth_url) {
                    window.location.href = data.auth_url;
                } else {
                    showNotification(data.message || 'Error obteniendo URL de autorización', 'error');
                }
            } catch (error) {
                console.error('Error getting auth URL:', error);
                showNotification('Error de conexión con el servidor', 'error');
            }
        });
    }

    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', async () => {
            if (!confirm('¿Estás seguro de desconectar Google Calendar? Las reservas existentes no se eliminarán del calendario.')) {
                return;
            }

            try {
                const response = await fetch('../backend/api/google-calendar.php?action=disconnect', {
                    method: 'POST',
                    credentials: 'include'
                });
                const data = await response.json();

                if (data.success) {
                    showNotification('Google Calendar desconectado', 'success');
                    loadCalendarStatus();
                } else {
                    showNotification(data.message || 'Error al desconectar', 'error');
                }
            } catch (error) {
                console.error('Error disconnecting:', error);
                showNotification('Error de conexión', 'error');
            }
        });
    }

    if (syncAllBtn) {
        syncAllBtn.addEventListener('click', async () => {
            syncAllBtn.disabled = true;
            syncAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';

            try {
                const response = await fetch('../backend/api/google-calendar.php?action=sync-all', {
                    method: 'POST',
                    credentials: 'include'
                });
                const data = await response.json();

                if (data.success) {
                    showNotification(`${data.synced} reservas sincronizadas`, 'success');
                    if (data.errors && data.errors.length > 0) {
                        console.warn('Errores de sincronización:', data.errors);
                    }
                } else {
                    showNotification(data.message || 'Error al sincronizar', 'error');
                }
            } catch (error) {
                console.error('Error syncing all:', error);
                showNotification('Error de conexión', 'error');
            } finally {
                syncAllBtn.disabled = false;
                syncAllBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar todas';
            }
        });
    }
}

async function loadCalendarStatus() {
    const statusEl = document.getElementById('calendarStatus');
    const detailsEl = document.getElementById('calendarDetails');
    const setupEl = document.getElementById('calendarSetup');
    const connectBtn = document.getElementById('connectCalendarBtn');
    const disconnectBtn = document.getElementById('disconnectCalendarBtn');
    const syncAllBtn = document.getElementById('syncAllBtn');
    const badge = document.getElementById('integrationBadge');
    const redirectUriEl = document.getElementById('redirectUriDisplay');

    if (!statusEl) return;

    try {
        const response = await fetch('../backend/api/google-calendar.php?action=status', {
            credentials: 'include'
        });
        const data = await response.json();

        // Mostrar URI de redirección
        if (redirectUriEl && data.auth_url) {
            const url = new URL(data.auth_url);
            redirectUriEl.textContent = url.searchParams.get('redirect_uri') || '—';
        }

        if (data.connected) {
            statusEl.innerHTML = '<span class="status-badge status-confirmed">Conectado</span>';
            detailsEl.style.display = 'block';
            setupEl.style.display = 'none';
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'inline-flex';
            syncAllBtn.style.display = 'inline-flex';
            badge.style.display = 'none';

            document.getElementById('calendarDetailStatus').textContent = 'Activo';
            document.getElementById('calendarDetailExpires').textContent = data.expires_at
                ? new Date(data.expires_at).toLocaleString('es-CL')
                : '—';
        } else if (data.configured) {
            statusEl.innerHTML = '<span class="status-badge status-pending">Configurado, sin conectar</span>';
            detailsEl.style.display = 'none';
            setupEl.style.display = 'none';
            connectBtn.style.display = 'inline-flex';
            disconnectBtn.style.display = 'none';
            syncAllBtn.style.display = 'none';
            badge.style.display = 'inline-block';
        } else {
            statusEl.innerHTML = '<span class="status-badge status-disconnected">Sin configurar</span>';
            detailsEl.style.display = 'none';
            setupEl.style.display = 'block';
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'none';
            syncAllBtn.style.display = 'none';
            badge.style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Error loading calendar status:', error);
        statusEl.innerHTML = '<span class="status-badge status-disconnected">Error de conexión</span>';
        setupEl.style.display = 'block';
    }
}

function createModalContent(r) {
    const time = r.reservation_time ? r.reservation_time.substring(0, 5) : '--:--';
    return `
        <div class="detail-row">
            <div class="detail-label">ID:</div>
            <div class="detail-value">#${r.id}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Cliente:</div>
            <div class="detail-value">${r.name}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${r.email}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Teléfono:</div>
            <div class="detail-value">${r.phone}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Servicio:</div>
            <div class="detail-value">${formatServiceName(r.service)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Fecha:</div>
            <div class="detail-value">${formatDate(r.reservation_date)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Hora:</div>
            <div class="detail-value">${time}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Estado:</div>
            <div class="detail-value">
                <span class="status-badge status-${r.status}">
                    ${r.status === 'pending' ? 'Pendiente' : r.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                </span>
            </div>
        </div>
    `;
}

// ============================================
// BUSINESS HOURS MANAGEMENT
// ============================================

let businessHoursData = [];
let specialDaysData = [];
const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function initBusinessHours() {
    const saveBtn = document.getElementById('saveAllHoursBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAllHours);
    }

    const addSpecialDayBtn = document.getElementById('addSpecialDayBtn');
    if (addSpecialDayBtn) {
        addSpecialDayBtn.addEventListener('click', () => openSpecialDayModal());
    }

    const specialDayModalCancel = document.getElementById('specialDayModalCancel');
    if (specialDayModalCancel) {
        specialDayModalCancel.addEventListener('click', closeSpecialDayModal);
    }

    const specialDayModalSave = document.getElementById('specialDayModalSave');
    if (specialDayModalSave) {
        specialDayModalSave.addEventListener('click', saveSpecialDay);
    }

    const specialDayIsOpen = document.getElementById('specialDayIsOpen');
    if (specialDayIsOpen) {
        specialDayIsOpen.addEventListener('change', toggleSpecialDayHours);
    }

    // Modal close buttons
    const modalCloses = document.querySelectorAll('#specialDayModal .modal-close');
    modalCloses.forEach(btn => {
        btn.addEventListener('click', closeSpecialDayModal);
    });

    // Load hours data
    loadBusinessHours();
}

async function loadBusinessHours() {
    try {
        const response = await fetch('../backend/api/business-hours.php');
        const data = await response.json();

        if (data.success) {
            businessHoursData = data.businessHours || [];
            renderWeeklyHours();
        }

        // Load special days
        const specialResponse = await fetch('../backend/api/business-hours.php?special_days=1');
        const specialData = await specialResponse.json();

        if (specialData.success) {
            specialDaysData = specialData.specialDays || [];
            renderSpecialDaysTable();
        }
    } catch (error) {
        console.error('Error loading business hours:', error);
        // Demo data for development
        businessHoursData = getDemoBusinessHours();
        specialDaysData = [];
        renderWeeklyHours();
        renderSpecialDaysTable();
    }
}

function getDemoBusinessHours() {
    return [
        { day_of_week: 0, day_name: 'Domingo', is_open: false, open_time: null, close_time: null, break_start: null, break_end: null, slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 1, day_name: 'Lunes', is_open: true, open_time: '09:00:00', close_time: '19:00:00', break_start: '14:00:00', break_end: '15:00:00', slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 2, day_name: 'Martes', is_open: true, open_time: '09:00:00', close_time: '19:00:00', break_start: '14:00:00', break_end: '15:00:00', slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 3, day_name: 'Miércoles', is_open: true, open_time: '09:00:00', close_time: '19:00:00', break_start: '14:00:00', break_end: '15:00:00', slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 4, day_name: 'Jueves', is_open: true, open_time: '09:00:00', close_time: '19:00:00', break_start: '14:00:00', break_end: '15:00:00', slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 5, day_name: 'Viernes', is_open: true, open_time: '09:00:00', close_time: '19:00:00', break_start: '14:00:00', break_end: '15:00:00', slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 6, day_name: 'Sábado', is_open: true, open_time: '10:00:00', close_time: '16:00:00', break_start: null, break_end: null, slot_duration: 60, max_bookings_per_slot: 1, is_active: true }
    ];
}

function renderWeeklyHours() {
    const container = document.getElementById('weeklyHoursContainer');
    if (!container) return;

    container.innerHTML = businessHoursData.map(day => `
        <div class="hour-card ${!day.is_open ? 'closed' : ''}" data-day="${day.day_of_week}">
            <div class="hour-card-header">
                <h4>${day.day_name}</h4>
                <span class="${day.is_open ? 'open-badge' : 'closed-badge'}">
                    ${day.is_open ? 'Abierto' : 'Cerrado'}
                </span>
            </div>
            <div class="hour-card-body">
                <div class="checkbox-wrapper">
                    <input type="checkbox" id="isOpen_${day.day_of_week}"
                        ${day.is_open ? 'checked' : ''}
                        onchange="toggleDayHours(${day.day_of_week})">
                    <span>Día de atención</span>
                </div>
                <div id="hours_${day.day_of_week}" style="${day.is_open ? '' : 'display: none;'}">
                    <div class="hour-row">
                        <label>Apertura:</label>
                        <input type="time" id="openTime_${day.day_of_week}"
                            value="${day.open_time ? day.open_time.substring(0, 5) : '09:00'}"
                            ${!day.is_open ? 'disabled' : ''}>
                    </div>
                    <div class="hour-row">
                        <label>Cierre:</label>
                        <input type="time" id="closeTime_${day.day_of_week}"
                            value="${day.close_time ? day.close_time.substring(0, 5) : '19:00'}"
                            ${!day.is_open ? 'disabled' : ''}>
                    </div>
                    <div class="break-times">
                        <div class="break-times-label">🕐 Hora de descanso</div>
                        <div class="hour-row">
                            <label>Inicio:</label>
                            <input type="time" id="breakStart_${day.day_of_week}"
                                value="${day.break_start ? day.break_start.substring(0, 5) : '14:00'}"
                                ${!day.is_open ? 'disabled' : ''}>
                        </div>
                        <div class="hour-row">
                            <label>Fin:</label>
                            <input type="time" id="breakEnd_${day.day_of_week}"
                                value="${day.break_end ? day.break_end.substring(0, 5) : '15:00'}"
                                ${!day.is_open ? 'disabled' : ''}>
                        </div>
                    </div>
                    <div class="hour-row" style="margin-top: 0.75rem;">
                        <label>Duración slot:</label>
                        <input type="number" id="slotDuration_${day.day_of_week}"
                            value="${day.slot_duration || 60}" min="15" max="180" step="15"
                            ${!day.is_open ? 'disabled' : ''} style="width: 70px;">
                        <span style="font-size: 0.8rem; color: #888;">min</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleDayHours(dayOfWeek) {
    const isOpen = document.getElementById(`isOpen_${dayOfWeek}`).checked;
    const hoursDiv = document.getElementById(`hours_${dayOfWeek}`);
    const inputs = hoursDiv.querySelectorAll('input');

    if (isOpen) {
        hoursDiv.style.display = 'block';
        inputs.forEach(input => input.disabled = false);
    } else {
        hoursDiv.style.display = 'none';
        inputs.forEach(input => input.disabled = true);
    }
}

async function saveAllHours() {
    const saveBtn = document.getElementById('saveAllHoursBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    saveBtn.disabled = true;

    try {
        let allSuccess = true;

        for (let i = 0; i < 7; i++) {
            const isOpen = document.getElementById(`isOpen_${i}`).checked;
            const data = {
                action: 'update_hours',
                dayOfWeek: i,
                is_open: isOpen,
                open_time: isOpen ? document.getElementById(`openTime_${i}`).value + ':00' : null,
                close_time: isOpen ? document.getElementById(`closeTime_${i}`).value + ':00' : null,
                break_start: isOpen ? document.getElementById(`breakStart_${i}`).value + ':00' : null,
                break_end: isOpen ? document.getElementById(`breakEnd_${i}`).value + ':00' : null,
                slot_duration: parseInt(document.getElementById(`slotDuration_${i}`).value) || 60,
                max_bookings_per_slot: 1,
                is_active: true
            };

            const response = await fetch('../backend/api/business-hours.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!result.success) {
                allSuccess = false;
            }
        }

        if (allSuccess) {
            showNotification('Horarios guardados exitosamente', 'success');
            loadBusinessHours();
        } else {
            showNotification('Error al guardar algunos horarios', 'error');
        }
    } catch (error) {
        console.error('Error saving hours:', error);
        showNotification('Error de conexión. Verifica que el servidor esté corriendo.', 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function renderSpecialDaysTable() {
    const tbody = document.getElementById('specialDaysTableBody');
    const noData = document.getElementById('noSpecialDays');

    if (!tbody) return;

    if (!specialDaysData || specialDaysData.length === 0) {
        tbody.innerHTML = '';
        noData.style.display = 'block';
        return;
    }

    noData.style.display = 'none';
    tbody.innerHTML = specialDaysData.map(day => {
        const dateObj = new Date(day.date + 'T00:00:00');
        const dateFormatted = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeRange = day.is_open && day.open_time && day.close_time
            ? `${day.open_time.substring(0, 5)} - ${day.close_time.substring(0, 5)}`
            : '—';

        return `
            <tr>
                <td>${dateFormatted}</td>
                <td>${day.name}</td>
                <td>
                    <span class="${day.is_open ? 'special-day-open' : 'special-day-closed'}">
                        ${day.is_open ? 'Abierto' : 'Cerrado'}
                    </span>
                </td>
                <td>${timeRange}</td>
                <td class="special-day-actions">
                    <button class="btn-icon btn-icon-edit" onclick="editSpecialDay(${day.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-icon-delete" onclick="deleteSpecialDay(${day.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openSpecialDayModal(day = null) {
    const modal = document.getElementById('specialDayModal');
    const title = document.getElementById('specialDayModalTitle');
    const form = document.getElementById('specialDayForm');

    if (day) {
        title.textContent = 'Editar Día Festivo';
        document.getElementById('specialDayId').value = day.id || '';
        document.getElementById('specialDayDate').value = day.date || '';
        document.getElementById('specialDayName').value = day.name || '';
        document.getElementById('specialDayIsOpen').checked = day.is_open || false;
        document.getElementById('specialDayOpenTime').value = day.open_time ? day.open_time.substring(0, 5) : '09:00';
        document.getElementById('specialDayCloseTime').value = day.close_time ? day.close_time.substring(0, 5) : '19:00';
        document.getElementById('specialDayBreakStart').value = day.break_start ? day.break_start.substring(0, 5) : '14:00';
        document.getElementById('specialDayBreakEnd').value = day.break_end ? day.break_end.substring(0, 5) : '15:00';
        document.getElementById('specialDayNotes').value = day.notes || '';
    } else {
        title.textContent = 'Agregar Día Festivo';
        form.reset();
        document.getElementById('specialDayId').value = '';
        document.getElementById('specialDayDate').value = '';
        document.getElementById('specialDayIsOpen').checked = false;
    }

    toggleSpecialDayHours();
    modal.style.display = 'block';
}

function closeSpecialDayModal() {
    const modal = document.getElementById('specialDayModal');
    modal.style.display = 'none';
}

function toggleSpecialDayHours() {
    const isOpen = document.getElementById('specialDayIsOpen').checked;
    const container = document.getElementById('specialDayHoursContainer');
    container.style.display = isOpen ? 'block' : 'none';
}

async function saveSpecialDay() {
    const id = document.getElementById('specialDayId').value;
    const isOpen = document.getElementById('specialDayIsOpen').checked;

    const data = {
        action: id ? 'update_special_day' : 'save_special_day',
        id: id ? parseInt(id) : null,
        date: document.getElementById('specialDayDate').value,
        name: document.getElementById('specialDayName').value,
        is_open: isOpen,
        open_time: isOpen ? document.getElementById('specialDayOpenTime').value + ':00' : null,
        close_time: isOpen ? document.getElementById('specialDayCloseTime').value + ':00' : null,
        break_start: isOpen ? document.getElementById('specialDayBreakStart').value + ':00' : null,
        break_end: isOpen ? document.getElementById('specialDayBreakEnd').value + ':00' : null,
        notes: document.getElementById('specialDayNotes').value,
        is_active: true
    };

    if (!data.date || !data.name) {
        showNotification('Fecha y nombre son requeridos', 'error');
        return;
    }

    try {
        const response = await fetch('../backend/api/business-hours.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showNotification(id ? 'Día festivo actualizado' : 'Día festivo agregado', 'success');
            closeSpecialDayModal();
            loadBusinessHours();
        } else {
            showNotification(result.message || 'Error al guardar', 'error');
        }
    } catch (error) {
        console.error('Error saving special day:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Hacer funciones globales para los handlers onclick del HTML
window.editSpecialDay = editSpecialDay;
window.deleteSpecialDay = deleteSpecialDay;
window.editTherapist = editTherapist;
window.deleteTherapist = deleteTherapist;
window.openAvailabilityModal = openAvailabilityModal;
window.openUnavailableModal = openUnavailableModal;
window.deleteUnavailableDay = deleteUnavailableDay;
window.toggleUnavailableTime = toggleUnavailableTime;

function editSpecialDay(id) {
    const day = specialDaysData.find(d => d.id === id);
    if (day) {
        openSpecialDayModal(day);
    }
}

async function deleteSpecialDay(id) {
    if (!confirm('¿Estás seguro de eliminar este día festivo?')) return;

    try {
        const response = await fetch('../backend/api/business-hours.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_special_day', id })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Día festivo eliminado', 'success');
            loadBusinessHours();
        } else {
            showNotification(result.message || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error deleting special day:', error);
        showNotification('Error de conexión', 'error');
    }
}

// ============================================
// THERAPISTS MANAGEMENT
// ============================================

let therapistsData = [];
const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function initTherapists() {
    const addBtn = document.getElementById('addTherapistBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openTherapistModal());
    }

    const therapistModalCancel = document.getElementById('therapistModalCancel');
    if (therapistModalCancel) {
        therapistModalCancel.addEventListener('click', closeTherapistModal);
    }

    const therapistModalSave = document.getElementById('therapistModalSave');
    if (therapistModalSave) {
        therapistModalSave.addEventListener('click', saveTherapist);
    }

    const availabilityModalCancel = document.getElementById('availabilityModalCancel');
    if (availabilityModalCancel) {
        availabilityModalCancel.addEventListener('click', closeAvailabilityModal);
    }

    const availabilityModalSave = document.getElementById('availabilityModalSave');
    if (availabilityModalSave) {
        availabilityModalSave.addEventListener('click', saveAvailability);
    }

    const unavailableModalCancel = document.getElementById('unavailableModalCancel');
    if (unavailableModalCancel) {
        unavailableModalCancel.addEventListener('click', closeUnavailableModal);
    }

    const unavailableModalSave = document.getElementById('unavailableModalSave');
    if (unavailableModalSave) {
        unavailableModalSave.addEventListener('click', saveUnavailableDay);
    }

    // Modal close buttons
    document.querySelectorAll('#therapistModal .modal-close').forEach(btn => {
        btn.addEventListener('click', closeTherapistModal);
    });
    document.querySelectorAll('#availabilityModal .modal-close').forEach(btn => {
        btn.addEventListener('click', closeAvailabilityModal);
    });
    document.querySelectorAll('#therapistUnavailableModal .modal-close').forEach(btn => {
        btn.addEventListener('click', closeUnavailableModal);
    });

    loadTherapists();
}

async function loadTherapists() {
    try {
        const response = await fetch('../backend/api/therapists.php?active=true');
        const data = await response.json();

        if (data.success) {
            therapistsData = data.therapists || [];
            renderTherapists();
        }
    } catch (error) {
        console.error('Error loading therapists:', error);
        // Demo data
        therapistsData = getDemoTherapists();
        renderTherapists();
    }
}

function getDemoTherapists() {
    return [
        { id: 1, name: 'Ana García', email: 'ana@sanacionconsciente.cl', phone: '+56912345678', specialty: 'Masaje Relajante, Aromaterapia', bio: 'Terapeuta certificada con 5 años de experiencia.', is_active: 1, max_daily_appointments: 6 },
        { id: 2, name: 'Carlos Mendoza', email: 'carlos@sanacionconsciente.cl', phone: '+56923456789', specialty: 'Masaje Terapéutico, Piedras Calientes', bio: 'Especialista en terapia de tejidos profundos.', is_active: 1, max_daily_appointments: 8 },
        { id: 3, name: 'María Fernández', email: 'maria@sanacionconsciente.cl', phone: '+56934567890', specialty: 'Reflexología, Masaje Prenatal', bio: 'Experta en reflexología podal.', is_active: 1, max_daily_appointments: 6 }
    ];
}

function renderTherapists() {
    const grid = document.getElementById('therapistsGrid');
    if (!grid) return;

    if (!therapistsData || therapistsData.length === 0) {
        grid.innerHTML = '<div class="empty-state-container"><div class="empty-icon">👤</div><h3>No hay terapeutas</h3><p>Haz clic en "Agregar Terapeuta" para crear uno</p></div>';
        return;
    }

    grid.innerHTML = therapistsData.map(t => `
        <div class="therapist-card ${!t.is_active ? 'inactive' : ''}">
            <div class="therapist-status">
                <span class="${t.is_active ? 'status-badge-active' : 'status-badge-inactive'}">
                    ${t.is_active ? 'Activo' : 'Inactivo'}
                </span>
            </div>
            <div class="therapist-header">
                <div class="therapist-avatar">${getInitials(t.name)}</div>
                <div class="therapist-info">
                    <h4>${t.name}</h4>
                    <p class="therapist-specialty">${t.specialty || 'Sin especialidad'}</p>
                </div>
            </div>
            <div class="therapist-body">
                ${t.email ? `<div class="therapist-detail"><i class="fas fa-envelope"></i><span>${t.email}</span></div>` : ''}
                ${t.phone ? `<div class="therapist-detail"><i class="fas fa-phone"></i><span>${t.phone}</span></div>` : ''}
                <div class="therapist-detail"><i class="fas fa-calendar-check"></i><span>Máx. ${t.max_daily_appointments || 8} citas/día</span></div>
                ${t.bio ? `<div class="therapist-bio">${t.bio}</div>` : ''}
            </div>
            <div class="therapist-footer">
                <div class="therapist-actions">
                    <button class="btn-icon btn-availability" onclick="openAvailabilityModal(${t.id})">
                        <i class="fas fa-clock"></i> Disponibilidad
                    </button>
                    <button class="btn-icon" onclick="openUnavailableModal(${t.id})">
                        <i class="fas fa-ban"></i> Bloquear día
                    </button>
                    <button class="btn-icon btn-icon-edit" onclick="editTherapist(${t.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-icon-delete" onclick="deleteTherapist(${t.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function getInitials(name) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function openTherapistModal(therapist = null) {
    const modal = document.getElementById('therapistModal');
    const title = document.getElementById('therapistModalTitle');

    if (therapist) {
        title.textContent = 'Editar Terapeuta';
        document.getElementById('therapistId').value = therapist.id || '';
        document.getElementById('therapistName').value = therapist.name || '';
        document.getElementById('therapistEmail').value = therapist.email || '';
        document.getElementById('therapistPhone').value = therapist.phone || '';
        document.getElementById('therapistSpecialty').value = therapist.specialty || '';
        document.getElementById('therapistBio').value = therapist.bio || '';
        document.getElementById('therapistMaxAppointments').value = therapist.max_daily_appointments || 8;
        document.getElementById('therapistIsActive').checked = therapist.is_active == 1;
    } else {
        title.textContent = 'Agregar Terapeuta';
        document.getElementById('therapistForm').reset();
        document.getElementById('therapistId').value = '';
        document.getElementById('therapistMaxAppointments').value = 8;
        document.getElementById('therapistIsActive').checked = true;
    }

    modal.style.display = 'block';
}

function closeTherapistModal() {
    document.getElementById('therapistModal').style.display = 'none';
}

async function saveTherapist() {
    const id = document.getElementById('therapistId').value;
    const data = {
        action: id ? 'update' : 'create',
        id: id ? parseInt(id) : null,
        name: document.getElementById('therapistName').value,
        email: document.getElementById('therapistEmail').value,
        phone: document.getElementById('therapistPhone').value,
        specialty: document.getElementById('therapistSpecialty').value,
        bio: document.getElementById('therapistBio').value,
        max_daily_appointments: parseInt(document.getElementById('therapistMaxAppointments').value) || 8,
        is_active: document.getElementById('therapistIsActive').checked
    };

    if (!data.name) {
        showNotification('Nombre es requerido', 'error');
        return;
    }

    try {
        const response = await fetch('../backend/api/therapists.php', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showNotification(id ? 'Terapeuta actualizado' : 'Terapeuta creado', 'success');
            closeTherapistModal();
            loadTherapists();
        } else {
            showNotification(result.message || 'Error al guardar', 'error');
        }
    } catch (error) {
        console.error('Error saving therapist:', error);
        showNotification('Error de conexión', 'error');
    }
}

function editTherapist(id) {
    const therapist = therapistsData.find(t => t.id === id);
    if (therapist) {
        openTherapistModal(therapist);
    }
}

async function deleteTherapist(id) {
    if (!confirm('¿Estás seguro de eliminar este terapeuta? Esta acción no se puede deshacer.')) return;

    try {
        const response = await fetch('../backend/api/therapists.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Terapeuta eliminado', 'success');
            loadTherapists();
        } else {
            showNotification(result.message || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error deleting therapist:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Availability Management
let currentTherapistId = null;
let availabilityData = [];

async function openAvailabilityModal(therapistId) {
    currentTherapistId = therapistId;
    const modal = document.getElementById('therapistAvailabilityModal');
    const container = document.getElementById('therapistAvailabilityContainer');

    try {
        const response = await fetch(`../backend/api/therapists.php?availability=${therapistId}`);
        const data = await response.json();

        if (data.success) {
            availabilityData = data.availability || [];
        }
    } catch (error) {
        console.error('Error loading availability:', error);
        availabilityData = getDemoAvailability();
    }

    const therapist = therapistsData.find(t => t.id === therapistId);
    document.getElementById('availabilityModalTitle').textContent = `Disponibilidad de ${therapist?.name || 'Terapeuta'}`;

    container.innerHTML = renderAvailabilityGrid();
    modal.style.display = 'block';
}

function getDemoAvailability() {
    return [
        { day_of_week: 1, is_available: 1, start_time: '09:00:00', end_time: '18:00:00', break_start: '13:00:00', break_end: '14:00:00' },
        { day_of_week: 2, is_available: 1, start_time: '09:00:00', end_time: '18:00:00', break_start: '13:00:00', break_end: '14:00:00' },
        { day_of_week: 3, is_available: 1, start_time: '09:00:00', end_time: '18:00:00', break_start: '13:00:00', break_end: '14:00:00' },
        { day_of_week: 4, is_available: 1, start_time: '09:00:00', end_time: '18:00:00', break_start: '13:00:00', break_end: '14:00:00' },
        { day_of_week: 5, is_available: 1, start_time: '09:00:00', end_time: '18:00:00', break_start: '13:00:00', break_end: '14:00:00' },
        { day_of_week: 6, is_available: 0, start_time: null, end_time: null, break_start: null, break_end: null }
    ];
}

function renderAvailabilityGrid() {
    return dayNamesShort.map((day, index) => {
        const dayData = availabilityData.find(d => parseInt(d.day_of_week) === index) || {
            day_of_week: index,
            is_available: 0,
            start_time: '09:00',
            end_time: '18:00',
            break_start: '13:00',
            break_end: '14:00'
        };

        const startTime = dayData.start_time ? dayData.start_time.substring(0, 5) : '09:00';
        const endTime = dayData.end_time ? dayData.end_time.substring(0, 5) : '18:00';
        const breakStart = dayData.break_start ? dayData.break_start.substring(0, 5) : '13:00';
        const breakEnd = dayData.break_end ? dayData.break_end.substring(0, 5) : '14:00';

        return `
            <div class="availability-day">
                <div class="availability-day-header">
                    <h5>${day}</h5>
                    <label>
                        <input type="checkbox" data-day="${index}" class="avail-checkbox"
                            ${dayData.is_available ? 'checked' : ''}
                            onchange="toggleDayAvailability(${index})">
                        <span>Disponible</span>
                    </label>
                </div>
                <div class="availability-day-body" id="availBody_${index}" style="${dayData.is_available ? '' : 'display:none;'}">
                    <div class="availability-times">
                        <input type="time" class="avail-start" data-day="${index}" value="${startTime}" ${!dayData.is_available ? 'disabled' : ''}>
                        <input type="time" class="avail-end" data-day="${index}" value="${endTime}" ${!dayData.is_available ? 'disabled' : ''}>
                    </div>
                    <div style="margin-top:0.5rem;font-size:0.75rem;color:#888;">Descanso:</div>
                    <div class="availability-times">
                        <input type="time" class="avail-break-start" data-day="${index}" value="${breakStart}" ${!dayData.is_available ? 'disabled' : ''}>
                        <input type="time" class="avail-break-end" data-day="${index}" value="${breakEnd}" ${!dayData.is_available ? 'disabled' : ''}>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleDayAvailability(dayIndex) {
    const checkbox = document.querySelector(`.avail-checkbox[data-day="${dayIndex}"]`);
    const body = document.getElementById(`availBody_${dayIndex}`);
    const inputs = body.querySelectorAll('input');

    if (checkbox.checked) {
        body.style.display = 'flex';
        inputs.forEach(input => input.disabled = false);
    } else {
        body.style.display = 'none';
        inputs.forEach(input => input.disabled = true);
    }
}

async function saveAvailability() {
    const saveBtn = document.getElementById('availabilityModalSave');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    saveBtn.disabled = true;

    const availability = [];
    for (let i = 0; i < 7; i++) {
        const checkbox = document.querySelector(`.avail-checkbox[data-day="${i}"]`);
        const isAvailable = checkbox.checked;

        availability.push({
            day_of_week: i,
            is_available: isAvailable,
            start_time: isAvailable ? document.querySelector(`.avail-start[data-day="${i}"]`).value + ':00' : null,
            end_time: isAvailable ? document.querySelector(`.avail-end[data-day="${i}"]`).value + ':00' : null,
            break_start: isAvailable ? document.querySelector(`.avail-break-start[data-day="${i}"]`).value + ':00' : null,
            break_end: isAvailable ? document.querySelector(`.avail-break-end[data-day="${i}"]`).value + ':00' : null
        });
    }

    try {
        const response = await fetch('../backend/api/therapists.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_availability',
                therapistId: currentTherapistId,
                availability
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Disponibilidad guardada', 'success');
            closeAvailabilityModal();
        } else {
            showNotification(result.message || 'Error al guardar', 'error');
        }
    } catch (error) {
        console.error('Error saving availability:', error);
        showNotification('Error de conexión', 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function closeAvailabilityModal() {
    document.getElementById('therapistAvailabilityModal').style.display = 'none';
    currentTherapistId = null;
}

// Unavailable Days Management
async function openUnavailableModal(therapistId) {
    currentTherapistId = therapistId;
    document.getElementById('unavailableTherapistId').value = therapistId;
    document.getElementById('therapistUnavailableForm').reset();
    document.getElementById('unavailableAllDay').checked = true;
    toggleUnavailableTime();
    document.getElementById('therapistUnavailableModal').style.display = 'block';
}

function toggleUnavailableTime() {
    const allDay = document.getElementById('unavailableAllDay').checked;
    const timeContainer = document.getElementById('unavailableTimeContainer');
    timeContainer.style.display = allDay ? 'none' : 'block';
}

function closeUnavailableModal() {
    document.getElementById('therapistUnavailableModal').style.display = 'none';
}

async function saveUnavailableDay() {
    const data = {
        action: 'add_unavailable_day',
        therapistId: parseInt(document.getElementById('unavailableTherapistId').value),
        date: document.getElementById('unavailableDate').value,
        reason: document.getElementById('unavailableReason').value,
        is_all_day: document.getElementById('unavailableAllDay').checked,
        start_time: document.getElementById('unavailableAllDay').checked ? null : document.getElementById('unavailableStartTime').value + ':00',
        end_time: document.getElementById('unavailableAllDay').checked ? null : document.getElementById('unavailableEndTime').value + ':00'
    };

    if (!data.date) {
        showNotification('Fecha es requerida', 'error');
        return;
    }

    try {
        const response = await fetch('../backend/api/therapists.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Día bloqueado exitosamente', 'success');
            closeUnavailableModal();
        } else {
            showNotification(result.message || 'Error al guardar', 'error');
        }
    } catch (error) {
        console.error('Error saving unavailable day:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function deleteUnavailableDay(id) {
    if (!confirm('¿Estás seguro de desbloquear este día?')) return;

    try {
        const response = await fetch('../backend/api/therapists.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'remove_unavailable_day', id })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Día desbloqueado', 'success');
        } else {
            showNotification(result.message || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error deleting unavailable day:', error);
        showNotification('Error de conexión', 'error');
    }
}

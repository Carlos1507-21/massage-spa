
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


// ============================================
// SANACIÓN CONSCIENTE - Admin Panel JavaScript
// ============================================

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('[Admin] DOMContentLoaded iniciado');

    checkAuth();
    initNavigation();
    initStats();
    initReservations();
    initModal();
    initLogout();
    initSearch();
    initIntegrations();
    initBusinessHours();
    initPromotions();
    initManualReservation();

    console.log('[Admin] Inicializacion completa');
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/backend/api/auth/check', { credentials: 'include' });
        const data = await response.json();

        if (!data.success) {
            window.location.href = 'login';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'login';
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
        const response = await fetch('/backend/api/reservations', { credentials: 'include' });
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

            // Revenue basado en precios de servicios (o precio manual si existe)
            let revenue = 0;
            reservations.filter(r => r.status === 'confirmed').forEach(r => {
                revenue += (r.price || MANUAL_REGULAR_PRICES[r.service] || 0);
            });
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
                    <h4>${escapeHtml(r.name)}</h4>
                    <p>${escapeHtml(formatServiceName(r.service))} • ${escapeHtml(formatDate(r.reservation_date))}</p>
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
                    <span class="time">${escapeHtml(time)}</span>
                    <span class="ampm">${ampm}</span>
                </div>
                <div class="appointment-details">
                    <h4>${escapeHtml(r.name)}</h4>
                    <p>${escapeHtml(formatServiceName(r.service))}</p>
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
            ? '/backend/api/reservations'
            : `/backend/api/reservations?status=${filter}`;

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
    const statusClass = `status-${escapeHtml(r.status)}`;
    const statusText = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmada',
        'cancelled': 'Cancelada'
    }[r.status] || escapeHtml(r.status);

    const time = r.reservation_time ? r.reservation_time.substring(0, 5) : '--:--';

    return `
        <tr>
            <td>#${escapeHtml(String(r.id))}</td>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td>${escapeHtml(formatServiceName(r.service))}</td>
            <td>${escapeHtml(formatDate(r.reservation_date))}</td>
            <td>${escapeHtml(time)}</td>
            <td>
                <div>${escapeHtml(r.email)}</div>
                <small>${escapeHtml(r.phone)}</small>
            </td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="actions">
                    <button class="btn-action btn-view" data-id="${escapeHtml(String(r.id))}" title="Ver detalle">👁️</button>
                    ${r.status === 'pending' ? `
                        <button class="btn-action btn-confirm" data-id="${escapeHtml(String(r.id))}" title="Confirmar">✓</button>
                    ` : ''}
                    ${r.status !== 'cancelled' ? `
                        <button class="btn-action btn-cancel" data-id="${escapeHtml(String(r.id))}" title="Cancelar">✕</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

// View reservation detail
async function viewReservation(id) {
    try {
        const response = await fetch(`/backend/api/reservations?id=${id}`, { credentials: 'include' });
        const data = await response.json();

        if (data.success && data.data) {
            const r = data.data;
            currentReservationData = r;
            renderReservationView(r);
        }
    } catch (error) {
        console.error('Error viewing reservation:', error);
        showNotification('Error al cargar detalles', 'error');
    }
}

function renderReservationView(r) {
    const time = r.reservation_time ? r.reservation_time.substring(0, 5) : '--:--';
    const regularPrice = MANUAL_REGULAR_PRICES[r.service] || 0;
    const currentPrice = r.price || regularPrice;

    const html = `
        <div class="detail-row">
            <div class="detail-label">ID:</div>
            <div class="detail-value">#${escapeHtml(String(r.id))}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Cliente:</div>
            <div class="detail-value">${escapeHtml(r.name)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${escapeHtml(r.email)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Teléfono:</div>
            <div class="detail-value">${escapeHtml(r.phone)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Servicio:</div>
            <div class="detail-value">${escapeHtml(formatServiceName(r.service))}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Fecha:</div>
            <div class="detail-value">${escapeHtml(formatDate(r.reservation_date))}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Hora:</div>
            <div class="detail-value">${escapeHtml(time)}</div>
        </div>
        ${r.message ? `
        <div class="detail-row">
            <div class="detail-label">Mensaje:</div>
            <div class="detail-value">${escapeHtml(r.message)}</div>
        </div>
        ` : ''}
        <div class="detail-row">
            <div class="detail-label">Estado:</div>
            <div class="detail-value">
                <span class="status-badge status-${escapeHtml(r.status)}">
                    ${r.status === 'pending' ? 'Pendiente' : r.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                </span>
            </div>
        </div>
        <hr style="margin:1rem 0; border:none; border-top:1px solid #eee;">
        <div class="detail-row">
            <div class="detail-label">Precio:</div>
            <div class="detail-value" id="modalPriceSection">
                <div style="margin-bottom:0.5rem;">
                    <strong>Precio actual:</strong> $${Number(currentPrice).toLocaleString('es-CL')} CLP
                    ${r.price ? '<span style="color:#4CAF7A; font-size:0.85rem;">(modificado manualmente)</span>' : '<span style="color:#888; font-size:0.85rem;">(precio regular)</span>'}
                </div>
                <div id="modalPromoOptions" style="margin-bottom:0.5rem;"></div>
                <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                    <input type="number" id="modalPriceInput" value="${currentPrice}" min="0" step="500" class="form-control" style="width:120px;" placeholder="Precio CLP">
                    <button class="btn-primary" id="modalSavePriceBtn" style="padding:0.4rem 0.8rem; font-size:0.85rem;">
                        Guardar precio
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalBody').innerHTML = html;

    // Cargar promociones activas para esta fecha/servicio
    loadModalPromoOptions(r.id, r.service, r.reservation_date, regularPrice, currentPrice);

    // Configurar botón guardar precio
    const savePriceBtn = document.getElementById('modalSavePriceBtn');
    if (savePriceBtn) {
        savePriceBtn.addEventListener('click', () => saveReservationPrice(r.id));
    }

    // Botones del footer
    const confirmBtn = document.getElementById('modalConfirm');
    const editBtn = document.getElementById('modalEdit');
    const saveEditBtn = document.getElementById('modalSaveEdit');

    if (confirmBtn) {
        if (r.status === 'pending') {
            confirmBtn.style.display = 'block';
            confirmBtn.onclick = () => {
                updateReservationStatus(r.id, 'confirmed');
                closeModal();
            };
        } else {
            confirmBtn.style.display = 'none';
            confirmBtn.onclick = null;
        }
    }
    if (editBtn) editBtn.style.display = 'block';
    if (saveEditBtn) saveEditBtn.style.display = 'none';

    openModal();
}

function renderReservationEditForm(r) {
    const serviceOptions = [
        { value: 'relajante-espalda', label: 'Masaje Relajante (Espalda) — 45 min · $20.000' },
        { value: 'relajante-completo', label: 'Masaje Relajante (Cuerpo Completo) — 60 min · $30.000' },
        { value: 'piedras-espalda', label: 'Relajación + Piedras Calientes (Espalda) — 45 min · $30.000' },
        { value: 'piedras-completo', label: 'Relajación + Piedras Calientes (Cuerpo Completo) — 60 min · $35.000' },
        { value: 'aromaterapia-espalda', label: 'Aromaterapia (Espalda) — 30 min · $25.000' },
        { value: 'aromaterapia-completo', label: 'Aromaterapia (Cuerpo Completo) — 45 min · $30.000' }
    ];

    const serviceSelectHtml = serviceOptions.map(opt =>
        `<option value="${opt.value}" ${r.service === opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`
    ).join('');

    const html = `
        <div class="form-group">
            <label>Nombre completo</label>
            <input type="text" id="editName" class="form-control" value="${escapeHtml(r.name)}">
        </div>
        <div class="form-group">
            <label>Email</label>
            <input type="email" id="editEmail" class="form-control" value="${escapeHtml(r.email)}">
        </div>
        <div class="form-group">
            <label>Teléfono</label>
            <input type="tel" id="editPhone" class="form-control" value="${escapeHtml(r.phone)}">
        </div>
        <div class="form-group">
            <label>Servicio</label>
            <select id="editService" class="form-control">${serviceSelectHtml}</select>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Fecha</label>
                <input type="date" id="editDate" class="form-control" value="${r.reservation_date}">
            </div>
            <div class="form-group">
                <label>Hora</label>
                <input type="time" id="editTime" class="form-control" value="${r.reservation_time ? r.reservation_time.substring(0, 5) : ''}">
            </div>
        </div>
        <div class="form-group">
            <label>Mensaje</label>
            <textarea id="editMessage" rows="2" class="form-control">${escapeHtml(r.message || '')}</textarea>
        </div>
        <div class="form-group" style="margin-top:1rem; padding-top:1rem; border-top:1px solid #eee;">
            <label>Precio (CLP)</label>
            <div style="display:flex; gap:0.5rem; align-items:center;">
                <input type="number" id="editPrice" class="form-control" style="width:140px;" value="${r.price || MANUAL_REGULAR_PRICES[r.service] || 0}" min="0" step="500">
                <span style="font-size:0.85rem; color:#666;">Regular: $${Number(MANUAL_REGULAR_PRICES[r.service] || 0).toLocaleString('es-CL')}</span>
            </div>
        </div>
    `;

    document.getElementById('modalBody').innerHTML = html;

    // Botones del footer
    const confirmBtn = document.getElementById('modalConfirm');
    const editBtn = document.getElementById('modalEdit');
    const saveEditBtn = document.getElementById('modalSaveEdit');

    if (confirmBtn) confirmBtn.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';
    if (saveEditBtn) saveEditBtn.style.display = 'block';
}

async function saveReservationEdit() {
    if (!currentReservationData) return;

    const id = currentReservationData.id;
    const name = document.getElementById('editName')?.value.trim();
    const email = document.getElementById('editEmail')?.value.trim();
    const phone = document.getElementById('editPhone')?.value.trim();
    const service = document.getElementById('editService')?.value;
    const date = document.getElementById('editDate')?.value;
    const time = document.getElementById('editTime')?.value;
    const message = document.getElementById('editMessage')?.value.trim();
    const price = document.getElementById('editPrice')?.value;

    const payload = { id };
    if (name !== undefined && name !== currentReservationData.name) payload.name = name;
    if (email !== undefined && email !== currentReservationData.email) payload.email = email;
    if (phone !== undefined && phone !== currentReservationData.phone) payload.phone = phone;
    if (service !== undefined && service !== currentReservationData.service) payload.service = service;
    if (date !== undefined && date !== currentReservationData.reservation_date) payload.date = date;
    if (time !== undefined) {
        const currentTime = currentReservationData.reservation_time ? currentReservationData.reservation_time.substring(0, 5) : '';
        if (time !== currentTime) payload.time = time || null;
    }
    if (message !== undefined && message !== (currentReservationData.message || '')) payload.message = message;
    if (price !== undefined) {
        const priceNum = parseInt(price, 10);
        if (!isNaN(priceNum) && priceNum >= 0 && priceNum !== (currentReservationData.price || MANUAL_REGULAR_PRICES[currentReservationData.service] || 0)) {
            payload.price = priceNum;
        }
    }

    if (Object.keys(payload).length === 1) {
        showNotification('No hay cambios para guardar', 'info');
        return;
    }

    try {
        const response = await fetch('/backend/api/reservations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Reserva actualizada', 'success');
            // Recargar datos y volver a modo vista
            const refreshed = await fetch(`/backend/api/reservations?id=${id}`, { credentials: 'include' });
            const refreshedData = await refreshed.json();
            if (refreshedData.success && refreshedData.data) {
                currentReservationData = refreshedData.data;
                renderReservationView(currentReservationData);
            }
            loadReservations();
            updateStats();
        } else {
            showNotification(data.message || 'Error al actualizar', 'error');
        }
    } catch (error) {
        console.error('Error saving edit:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Update reservation status
async function updateReservationStatus(id, status) {
    try {
        const response = await fetch('/backend/api/reservations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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

// Load active promotions for modal price editor
async function loadModalPromoOptions(reservationId, service, date, regularPrice, currentPrice) {
    const container = document.getElementById('modalPromoOptions');
    if (!container) return;

    try {
        const response = await fetch(`/backend/api/promotions?date=${date}&service=${service}`);
        const result = await response.json();

        if (result.success && result.data && result.data.promotions && result.data.promotions.length > 0) {
            const promo = result.data.promotions[0];
            let promoPrice = promo.price;
            let discountLabel = '';

            if (promo.discount_type === 'percentage' && promo.discount_value > 0) {
                promoPrice = Math.round(regularPrice * (1 - promo.discount_value / 100));
                discountLabel = `${promo.discount_value}% de descuento`;
            }

            const isSelected = currentPrice === promoPrice;

            container.innerHTML = `
                <div style="background:#f0faf2; border-left:4px solid #4CAF7A; padding:0.5rem 0.75rem; border-radius:6px; font-size:0.85rem;"
                     onclick="applyPromoPrice(${reservationId}, ${promoPrice})"
                     style="cursor:pointer;"
                >
                    <strong style="color:#2d7a4f;">${escapeHtml(promo.name)}</strong>
                    ${discountLabel ? `<span style="color:#c44d4d; font-size:0.8rem;">(${escapeHtml(discountLabel)})</span>` : ''}<br>
                    <span style="text-decoration:line-through; color:#888;">$${regularPrice.toLocaleString('es-CL')}</span>
                    <span style="color:#c44d4d; font-weight:bold;"> $${Number(promoPrice).toLocaleString('es-CL')} CLP</span>
                    ${isSelected ? '<span style="color:#4CAF7A; font-weight:bold; margin-left:0.5rem;">✓ Aplicado</span>' : '<span style="color:#4CAF7A; margin-left:0.5rem; cursor:pointer; text-decoration:underline;">Aplicar</span>'}
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    } catch (error) {
        console.error('Error cargando promociones para modal:', error);
        container.innerHTML = '';
    }
}

// Apply promotional price to reservation
async function applyPromoPrice(id, price) {
    const priceInput = document.getElementById('modalPriceInput');
    if (priceInput) {
        priceInput.value = price;
    }
    await saveReservationPrice(id);
}

// Save custom price for reservation
async function saveReservationPrice(id) {
    const priceInput = document.getElementById('modalPriceInput');
    if (!priceInput) return;

    const price = parseInt(priceInput.value);
    if (isNaN(price) || price < 0) {
        showNotification('Precio inválido', 'error');
        return;
    }

    try {
        const response = await fetch('/backend/api/reservations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id, price })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Precio actualizado', 'success');
            loadReservations();
            updateStats();
        } else {
            showNotification(data.message || 'Error al actualizar precio', 'error');
        }
    } catch (error) {
        console.error('Error saving price:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Modal functions
let currentReservationData = null;

function initModal() {
    const modal = document.getElementById('reservationModal');
    const closeBtn = document.querySelector('.modal-close');
    const cancelBtn = document.getElementById('modalCancel');
    const editBtn = document.getElementById('modalEdit');
    const saveEditBtn = document.getElementById('modalSaveEdit');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (currentReservationData) {
                renderReservationEditForm(currentReservationData);
            }
        });
    }

    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', saveReservationEdit);
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
                await fetch('/backend/api/auth/logout', { method: 'POST', credentials: 'include' });
                window.location.href = 'login';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = 'login';
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
    const datePart = dateString.substring(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
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
        { id: 1, name: 'María González', email: 'maria@email.com', phone: '+56989908321', service: 'terapeutico', reservation_date: '2025-04-15', reservation_time: '15:00', status: 'pending' },
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
                window.location.href = '/backend/api/google-calendar/auth';
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
                const response = await fetch('/backend/api/google-calendar/disconnect', {
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
                const response = await fetch('/backend/api/google-calendar?action=sync-all', {
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
        const response = await fetch('/backend/api/google-calendar/status', {
            credentials: 'include'
        });
        const data = await response.json();

        redirectUriEl.textContent = 'https://sanacionconsciente.cl/backend/api/google-calendar/callback';

        if (data.data && data.data.connected) {
            statusEl.innerHTML = '<span class="status-badge status-confirmed">Conectado</span>';
            detailsEl.style.display = 'block';
            setupEl.style.display = 'none';
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'inline-flex';
            if (syncAllBtn) syncAllBtn.style.display = 'none';
            badge.style.display = 'none';

            document.getElementById('calendarDetailStatus').textContent = 'Activo';
            document.getElementById('calendarDetailExpires').textContent = '—';
        } else {
            statusEl.innerHTML = '<span class="status-badge status-disconnected">Sin conectar</span>';
            detailsEl.style.display = 'none';
            setupEl.style.display = 'block';
            connectBtn.style.display = 'inline-flex';
            disconnectBtn.style.display = 'none';
            if (syncAllBtn) syncAllBtn.style.display = 'none';
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
            <div class="detail-value">#${escapeHtml(String(r.id))}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Cliente:</div>
            <div class="detail-value">${escapeHtml(r.name)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${escapeHtml(r.email)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Teléfono:</div>
            <div class="detail-value">${escapeHtml(r.phone)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Servicio:</div>
            <div class="detail-value">${escapeHtml(formatServiceName(r.service))}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Fecha:</div>
            <div class="detail-value">${escapeHtml(formatDate(r.reservation_date))}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Hora:</div>
            <div class="detail-value">${escapeHtml(time)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Estado:</div>
            <div class="detail-value">
                <span class="status-badge status-${escapeHtml(r.status)}">
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

    // Event delegation para botones de dias festivos dinamicos
    const specialDaysTableBody = document.getElementById('specialDaysTableBody');
    if (specialDaysTableBody) {
        specialDaysTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-icon-edit, .btn-icon-delete');
            if (!btn) return;
            const id = parseInt(btn.dataset.id, 10);
            if (!id) return;
            if (btn.classList.contains('btn-icon-edit')) {
                editSpecialDay(id);
            } else if (btn.classList.contains('btn-icon-delete')) {
                deleteSpecialDay(id);
            }
        });
    }

    // Event delegation para checkboxes de horarios semanales
    const weeklyHoursContainer = document.getElementById('weeklyHoursContainer');
    if (weeklyHoursContainer) {
        weeklyHoursContainer.addEventListener('change', (e) => {
            const cb = e.target.closest('[data-action="toggle-day"]');
            if (!cb) return;
            const day = parseInt(cb.dataset.day, 10);
            if (!isNaN(day)) {
                toggleDayHours(day);
            }
        });
    }

    // Load hours data
    loadBusinessHours();
}

async function loadBusinessHours() {
    try {
        const response = await fetch('/backend/api/business-hours');
        const data = await response.json();

        if (data.success && data.data) {
            businessHoursData = data.data.businessHours || [];
            renderWeeklyHours();
        } else {
            console.warn('[Admin] API horarios: respuesta sin data', data);
            businessHoursData = getDemoBusinessHours();
            renderWeeklyHours();
        }

        // Load special days
        const specialResponse = await fetch('/backend/api/business-hours?special_days=1');
        const specialData = await specialResponse.json();

        if (specialData.success && specialData.data) {
            specialDaysData = specialData.data.specialDays || [];
            renderSpecialDaysTable();
        } else {
            specialDaysData = [];
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
        { day_of_week: 0, day_name: 'Domingo', is_open: true, open_time: '08:00:00', close_time: '18:00:00', break_start: null, break_end: null, slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 1, day_name: 'Lunes', is_open: true, open_time: '20:00:00', close_time: '21:00:00', break_start: null, break_end: null, slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 2, day_name: 'Martes', is_open: true, open_time: '20:00:00', close_time: '21:00:00', break_start: null, break_end: null, slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 3, day_name: 'Miércoles', is_open: true, open_time: '20:00:00', close_time: '21:00:00', break_start: null, break_end: null, slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 4, day_name: 'Jueves', is_open: true, open_time: '20:00:00', close_time: '21:00:00', break_start: null, break_end: null, slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 5, day_name: 'Viernes', is_open: true, open_time: '20:00:00', close_time: '21:00:00', break_start: null, break_end: null, slot_duration: 60, max_bookings_per_slot: 1, is_active: true },
        { day_of_week: 6, day_name: 'Sábado', is_open: false, open_time: null, close_time: null, break_start: null, break_end: null, slot_duration: 60, max_bookings_per_slot: 1, is_active: true }
    ];
}

function renderWeeklyHours() {
    const container = document.getElementById('weeklyHoursContainer');
    if (!container) return;

    if (!businessHoursData || businessHoursData.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-icon">📭</div>
            <h3>No hay horarios configurados</h3>
            <p>Los horarios semanales se cargarán automáticamente</p>
        </div>`;
        return;
    }

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
                        data-action="toggle-day" data-day="${day.day_of_week}">
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

            const response = await fetch('/backend/api/business-hours', {
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
        const [y, m, d] = day.date.substring(0, 10).split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
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
                    <button class="btn-icon btn-icon-edit" data-id="${day.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-icon-delete" data-id="${day.id}">
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
        document.getElementById('specialDayDate').value = day.date ? day.date.substring(0, 10) : '';
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
    modal.classList.add('active');
}

function closeSpecialDayModal() {
    const modal = document.getElementById('specialDayModal');
    if (modal) modal.classList.remove('active');
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
        const response = await fetch('/backend/api/business-hours', {
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

function editSpecialDay(id) {
    const day = specialDaysData.find(d => d.id === id);
    if (day) {
        openSpecialDayModal(day);
    }
}

async function deleteSpecialDay(id) {
    if (!confirm('¿Estás seguro de eliminar este día festivo?')) return;

    try {
        const response = await fetch('/backend/api/business-hours', {
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
// PROMOTIONS MANAGEMENT
// ============================================

let promotionsData = [];
let serviceOptionsData = [];

function initPromotions() {
    console.log('[Admin] initPromotions');
    const addBtn = document.getElementById('addPromotionBtn');
    const saveBtn = document.getElementById('promotionModalSave');
    const cancelBtn = document.getElementById('promotionModalCancel');
    const closeBtn = document.getElementById('promotionModalClose');
    const allCheckbox = document.getElementById('promoServiceAll');
    const discountType = document.getElementById('promoDiscountType');

    if (addBtn) {
        addBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[Admin] click addPromotionBtn');
            openPromotionModal();
        });
        console.log('[Admin] addPromotionBtn listener OK');
    } else {
        console.warn('[Admin] addPromotionBtn NO encontrado');
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', savePromotion);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closePromotionModal);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', closePromotionModal);
    }
    if (allCheckbox) {
        allCheckbox.addEventListener('change', togglePromoServices);
    }
    if (discountType) {
        discountType.addEventListener('change', updatePromoDiscountLabel);
    }

    // Event delegation para botones dinamicos de promociones
    const promotionsList = document.getElementById('promotionsList');
    if (promotionsList) {
        promotionsList.addEventListener('click', function(e) {
            console.log('[Admin] click en promotionsList, target:', e.target.tagName, e.target.className);
            const btn = e.target.closest('.btn-icon-edit, .btn-icon-delete');
            if (!btn) { console.log('[Admin] no es boton de editar/eliminar'); return; }
            const id = parseInt(btn.dataset.id, 10);
            console.log('[Admin] boton promo encontrado, id:', id, 'clase:', btn.className);
            if (!id) return;
            if (btn.classList.contains('btn-icon-edit')) {
                editPromotion(id);
            } else if (btn.classList.contains('btn-icon-delete')) {
                deletePromotion(id);
            }
        });
    }

    // Close on outside click
    const modal = document.getElementById('promotionModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closePromotionModal();
        });
    }

    loadPromotions();
}

async function loadPromotions() {
    const list = document.getElementById('promotionsList');
    const empty = document.getElementById('noPromotions');
    if (!list) return;

    list.innerHTML = '<div class="loading">Cargando promociones...</div>';

    try {
        const response = await fetch('/backend/api/promotions', { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            promotionsData = data.data?.promotions || [];
            serviceOptionsData = data.data?.serviceOptions || [];
            renderPromotionsList();
        } else {
            list.innerHTML = '';
            empty.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading promotions:', error);
        list.innerHTML = '';
        empty.style.display = 'block';
    }
}

function renderPromotionsList() {
    const list = document.getElementById('promotionsList');
    const empty = document.getElementById('noPromotions');
    if (!list) return;

    if (!promotionsData || promotionsData.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    const today = new Date().toISOString().split('T')[0];

    list.innerHTML = promotionsData.map(p => {
        const isActive = p.is_active;
        const isCurrent = p.start_date <= today && p.end_date >= today;
        const servicesText = p.applicable_services === 'all'
            ? 'Todos los servicios'
            : (Array.isArray(p.applicable_services) ? p.applicable_services.length + ' servicios' : 'Servicios seleccionados');

        const discountLabel = p.discount_type === 'percentage'
            ? `${p.discount_value}% de descuento`
            : `$${Number(p.price).toLocaleString('es-CL')} CLP`;

        return `
            <div class="promo-card ${isActive ? '' : 'inactive'}">
                <div class="promo-card-header">
                    <h3>${escapeHtml(p.name)}</h3>
                    <span class="status-badge ${isActive ? 'status-confirmed' : 'status-disconnected'}">
                        ${isActive ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
                <div class="promo-card-body">
                    <p class="promo-price">${escapeHtml(discountLabel)}</p>
                    <p class="promo-dates">${escapeHtml(formatDate(p.start_date))} — ${escapeHtml(formatDate(p.end_date))}</p>
                    <p class="promo-services">${escapeHtml(servicesText)}</p>
                    ${p.description ? `<p class="promo-desc">${escapeHtml(p.description)}</p>` : ''}
                </div>
                <div class="promo-card-actions">
                    <button class="btn-icon btn-icon-edit" data-id="${p.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-icon-delete" data-id="${p.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openPromotionModal(promo = null) {
    console.log('[Admin] openPromotionModal inicio', promo ? 'editando ID ' + promo.id : 'nueva');
    try {
        const modal = document.getElementById('promotionModal');
        const title = document.getElementById('promotionModalTitle');
        const form = document.getElementById('promotionForm');

        if (!modal) { console.error('[Admin] modal no encontrado'); return; }
        if (!form) { console.error('[Admin] form no encontrado'); return; }

        form.reset();
        togglePromoServices();

        if (promo) {
            title.textContent = 'Editar Promoción';
            document.getElementById('promotionId').value = promo.id;
            document.getElementById('promoName').value = promo.name || '';
            document.getElementById('promoDescription').value = promo.description || '';
            document.getElementById('promoDiscountType').value = promo.discount_type || 'fixed';
            document.getElementById('promoDiscountValue').value = promo.discount_value || promo.price || '';
            document.getElementById('promoStartDate').value = promo.start_date ? promo.start_date.substring(0, 10) : '';
            document.getElementById('promoEndDate').value = promo.end_date ? promo.end_date.substring(0, 10) : '';
            document.getElementById('promoActive').value = promo.is_active ? 'true' : 'false';

            const allCheckbox = document.getElementById('promoServiceAll');
            const serviceCheckboxes = document.querySelectorAll('.promo-service-item');

            if (promo.applicable_services === 'all') {
                allCheckbox.checked = true;
                serviceCheckboxes.forEach(cb => cb.disabled = true);
            } else {
                allCheckbox.checked = false;
                serviceCheckboxes.forEach(cb => {
                    cb.disabled = false;
                    const vals = Array.isArray(promo.applicable_services) ? promo.applicable_services : [];
                    cb.checked = vals.includes(cb.value);
                });
            }
        } else {
            title.textContent = 'Nueva Promoción';
            document.getElementById('promotionId').value = '';
            document.getElementById('promoDiscountType').value = 'fixed';
            document.getElementById('promoActive').value = 'true';
            const allCheckbox = document.getElementById('promoServiceAll');
            if (allCheckbox) allCheckbox.checked = true;
            const serviceCheckboxes = document.querySelectorAll('.promo-service-item');
            serviceCheckboxes.forEach(cb => { cb.checked = false; cb.disabled = true; });
        }

        updatePromoDiscountLabel();
        modal.classList.add('active');
        console.log('[Admin] modal activado con clase active');
    } catch (err) {
        console.error('[Admin] Error en openPromotionModal:', err);
    }
}

function updatePromoDiscountLabel() {
    const type = document.getElementById('promoDiscountType').value;
    const label = document.getElementById('promoDiscountLabel');
    const input = document.getElementById('promoDiscountValue');

    if (type === 'percentage') {
        label.textContent = 'Porcentaje de descuento (%) *';
        input.placeholder = '25';
        input.max = '100';
    } else {
        label.textContent = 'Precio promocional (CLP) *';
        input.placeholder = '15000';
        input.removeAttribute('max');
    }
}

function closePromotionModal() {
    const modal = document.getElementById('promotionModal');
    if (modal) modal.classList.remove('active');
}

function togglePromoServices() {
    const allChecked = document.getElementById('promoServiceAll').checked;
    const items = document.querySelectorAll('.promo-service-item');
    items.forEach(cb => {
        cb.disabled = allChecked;
        if (allChecked) cb.checked = false;
    });
}

async function savePromotion() {
    const id = document.getElementById('promotionId').value;
    const name = document.getElementById('promoName').value.trim();
    const description = document.getElementById('promoDescription').value.trim();
    const discountType = document.getElementById('promoDiscountType').value;
    const discountValue = parseInt(document.getElementById('promoDiscountValue').value, 10);
    const startDate = document.getElementById('promoStartDate').value;
    const endDate = document.getElementById('promoEndDate').value;
    const isActive = document.getElementById('promoActive').value === 'true';

    if (!name || !startDate || !endDate) {
        showNotification('Nombre, fecha inicio y fecha fin son requeridos', 'error');
        return;
    }

    if (isNaN(discountValue) || discountValue <= 0) {
        showNotification(discountType === 'percentage' ? 'El porcentaje debe ser mayor a 0' : 'El precio debe ser mayor a 0', 'error');
        return;
    }

    if (discountType === 'percentage' && discountValue > 100) {
        showNotification('El porcentaje no puede ser mayor a 100', 'error');
        return;
    }

    if (endDate < startDate) {
        showNotification('La fecha de fin no puede ser anterior a la de inicio', 'error');
        return;
    }

    const allChecked = document.getElementById('promoServiceAll').checked;
    let applicableServices = 'all';
    if (!allChecked) {
        const checked = Array.from(document.querySelectorAll('.promo-service-item:checked')).map(cb => cb.value);
        if (checked.length === 0) {
            showNotification('Selecciona al menos un servicio o marca "Todos los servicios"', 'error');
            return;
        }
        applicableServices = checked;
    }

    const payload = {
        name,
        description,
        discount_type: discountType,
        discount_value: discountValue,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
        applicable_services: applicableServices,
        serviceOptions: serviceOptionsData
    };

    const url = '/backend/api/promotions';
    const method = id ? 'PUT' : 'POST';
    if (id) payload.id = parseInt(id, 10);

    const saveBtn = document.getElementById('promotionModalSave');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    saveBtn.disabled = true;

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showNotification(id ? 'Promoción actualizada' : 'Promoción creada', 'success');
            closePromotionModal();
            loadPromotions();
        } else {
            showNotification(data.message || 'Error al guardar', 'error');
        }
    } catch (error) {
        console.error('Error saving promotion:', error);
        showNotification('Error de conexión', 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function editPromotion(id) {
    const promo = promotionsData.find(p => p.id === id);
    if (promo) {
        openPromotionModal(promo);
    } else {
        showNotification('Promoción no encontrada', 'error');
    }
}

async function deletePromotion(id) {
    if (!confirm('¿Estás seguro de eliminar esta promoción?')) return;

    try {
        const response = await fetch(`/backend/api/promotions?id=${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Promoción eliminada', 'success');
            loadPromotions();
        } else {
            showNotification(data.message || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error deleting promotion:', error);
        showNotification('Error de conexión', 'error');
    }
}

window.editPromotion = editPromotion;
window.deletePromotion = deletePromotion;

// ============================================
// MANUAL RESERVATIONS
// ============================================

function initManualReservation() {
    console.log('[Admin] initManualReservation');
    const newBtn = document.getElementById('newReservationBtn');
    const saveBtn = document.getElementById('newReservationModalSave');
    const cancelBtn = document.getElementById('newReservationModalCancel');
    const closeBtn = document.getElementById('newReservationModalClose');
    const serviceSelect = document.getElementById('manualService');
    const dateInput = document.getElementById('manualDate');

    if (newBtn) {
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[Admin] click newReservationBtn');
            openNewReservationModal();
        });
        console.log('[Admin] newReservationBtn listener OK');
    } else {
        console.warn('[Admin] newReservationBtn NO encontrado');
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', saveManualReservation);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeNewReservationModal);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', closeNewReservationModal);
    }
    if (serviceSelect && dateInput) {
        serviceSelect.addEventListener('change', loadManualTimeSlots);
        dateInput.addEventListener('change', loadManualTimeSlots);
        serviceSelect.addEventListener('change', updateManualPriceInfo);
        dateInput.addEventListener('change', updateManualPriceInfo);
    }

    // Checkbox "Sin costo"
    const noCostCheckbox = document.getElementById('manualNoCost');
    const customPriceContainer = document.getElementById('manualCustomPriceContainer');
    const customPriceInput = document.getElementById('manualPrice');
    if (noCostCheckbox && customPriceContainer) {
        noCostCheckbox.addEventListener('change', function() {
            if (this.checked) {
                customPriceContainer.style.display = 'flex';
                if (customPriceInput) customPriceInput.value = '0';
            } else {
                customPriceContainer.style.display = 'none';
                if (customPriceInput) customPriceInput.value = '';
            }
        });
    }

    const modal = document.getElementById('newReservationModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeNewReservationModal();
        });
    }
}

function openNewReservationModal() {
    console.log('[Admin] openNewReservationModal inicio');
    try {
        const modal = document.getElementById('newReservationModal');
        const form = document.getElementById('newReservationForm');
        const dateInput = document.getElementById('manualDate');

        if (!modal) { console.error('[Admin] newReservationModal no encontrado'); return; }
        if (!form) { console.error('[Admin] newReservationForm no encontrado'); return; }

        form.reset();

        // Sin restriccion de fecha para admin (puede reservar cualquier dia)
        if (dateInput) dateInput.removeAttribute('min');

        // Reset horarios
        const timeSelect = document.getElementById('manualTime');
        if (timeSelect) {
            timeSelect.innerHTML = '<option value="">Selecciona hora</option>';
            timeSelect.disabled = true;
        }

        // Reset precio
        const priceInfo = document.getElementById('manualPriceInfo');
        if (priceInfo) priceInfo.style.display = 'none';

        // Reset sin costo
        const noCostCheckbox = document.getElementById('manualNoCost');
        const customPriceContainer = document.getElementById('manualCustomPriceContainer');
        const customPriceInput = document.getElementById('manualPrice');
        if (noCostCheckbox) noCostCheckbox.checked = false;
        if (customPriceContainer) customPriceContainer.style.display = 'none';
        if (customPriceInput) customPriceInput.value = '';

        modal.classList.add('active');
        console.log('[Admin] newReservationModal activado con clase active');
    } catch (err) {
        console.error('[Admin] Error en openNewReservationModal:', err);
    }
}

function closeNewReservationModal() {
    const modal = document.getElementById('newReservationModal');
    if (modal) modal.classList.remove('active');
}

const MANUAL_SERVICE_DURATIONS = {
    'relajante-espalda': 45,
    'relajante-completo': 60,
    'piedras-espalda': 45,
    'piedras-completo': 60,
    'aromaterapia-espalda': 30,
    'aromaterapia-completo': 45
};

const MANUAL_REGULAR_PRICES = {
    'relajante-espalda': 20000,
    'relajante-completo': 30000,
    'piedras-espalda': 30000,
    'piedras-completo': 35000,
    'aromaterapia-espalda': 25000,
    'aromaterapia-completo': 30000
};

async function loadManualTimeSlots() {
    const dateInput = document.getElementById('manualDate');
    const serviceSelect = document.getElementById('manualService');
    const timeSelect = document.getElementById('manualTime');

    if (!dateInput || !serviceSelect || !timeSelect) return;

    const date = dateInput.value;
    const service = serviceSelect.value;

    if (!date || !service) {
        timeSelect.innerHTML = '<option value="">Selecciona hora</option>';
        timeSelect.disabled = true;
        return;
    }

    const duration = MANUAL_SERVICE_DURATIONS[service] || 60;
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
        console.error('Error loading manual time slots:', error);
        timeSelect.innerHTML = '';
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Error cargando horarios';
        timeSelect.appendChild(opt);
        timeSelect.disabled = true;
    }

    updateManualPriceInfo();
}

async function updateManualPriceInfo() {
    const serviceSelect = document.getElementById('manualService');
    const dateInput = document.getElementById('manualDate');
    const priceInfo = document.getElementById('manualPriceInfo');

    if (!serviceSelect || !dateInput || !priceInfo) return;

    const service = serviceSelect.value;
    const date = dateInput.value;

    if (!service || !date) {
        priceInfo.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`/backend/api/promotions?date=${date}&service=${service}`);
        const result = await response.json();

        if (result.success && result.data && result.data.promotions && result.data.promotions.length > 0) {
            const promo = result.data.promotions[0];
            const regular = MANUAL_REGULAR_PRICES[service] || 0;

            let finalPrice = promo.price;
            let discountLabel = '';

            if (promo.discount_type === 'percentage' && promo.discount_value > 0) {
                finalPrice = Math.round(regular * (1 - promo.discount_value / 100));
                discountLabel = `${promo.discount_value}% de descuento`;
            }

            const discount = regular - finalPrice;

            priceInfo.innerHTML = `
                <div style="background:#f0faf2; border-left:4px solid #4CAF7A; padding:0.75rem 1rem; border-radius:6px; font-size:0.9rem;">
                    <strong style="color:#2d7a4f;">${escapeHtml(promo.name)}</strong>
                    ${discountLabel ? `<span style="color:#c44d4d; font-size:0.85rem; margin-left:0.5rem;">(${escapeHtml(discountLabel)})</span>` : ''}<br>
                    <span style="text-decoration:line-through; color:#888;">$${regular.toLocaleString('es-CL')}</span>
                    <span style="color:#c44d4d; font-weight:bold;"> $${Number(finalPrice).toLocaleString('es-CL')} CLP</span>
                    ${discount > 0 ? `<span style="color:#4CAF7A; font-size:0.85rem;"> Ahorra $${discount.toLocaleString('es-CL')}</span>` : ''}
                </div>
            `;
            priceInfo.style.display = 'block';
        } else {
            priceInfo.style.display = 'none';
        }
    } catch (error) {
        console.error('Error cargando precio promocional:', error);
        priceInfo.style.display = 'none';
    }
}

async function saveManualReservation() {
    const name = document.getElementById('manualName').value.trim();
    const email = document.getElementById('manualEmail').value.trim();
    const phone = document.getElementById('manualPhone').value.trim();
    const service = document.getElementById('manualService').value;
    const date = document.getElementById('manualDate').value;
    const time = document.getElementById('manualTime').value;
    const message = document.getElementById('manualMessage').value.trim();
    const noCost = document.getElementById('manualNoCost');
    const customPriceInput = document.getElementById('manualPrice');

    if (!name) {
        showNotification('El nombre es obligatorio', 'error');
        return;
    }

    const duration = service ? (MANUAL_SERVICE_DURATIONS[service] || 60) : 60;

    const payload = {
        name,
        email: email || 'sin-email@local',
        phone: phone || 'Sin teléfono',
        service: service || 'relajante-completo',
        date: date || new Date().toISOString().split('T')[0],
        time: time || '10:00',
        service_duration: duration,
        message: message || '',
        is_admin: true
    };

    // Precio personalizado (0 o valor ingresado)
    if (noCost && noCost.checked) {
        payload.price = 0;
    } else if (customPriceInput && customPriceInput.value !== '') {
        const customPrice = parseInt(customPriceInput.value, 10);
        if (!isNaN(customPrice) && customPrice >= 0) {
            payload.price = customPrice;
        }
    }

    const saveBtn = document.getElementById('newReservationModalSave');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    saveBtn.disabled = true;

    try {
        const response = await fetch('/backend/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Reserva creada exitosamente', 'success');
            closeNewReservationModal();
            loadReservations();
            updateStats();
        } else {
            showNotification(data.message || 'Error al crear reserva', 'error');
        }
    } catch (error) {
        console.error('Error creating manual reservation:', error);
        showNotification('Error de conexión', 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ============================================
// THERAPISTS MANAGEMENT - REMOVED
// ============================================
// This is a personal business (single therapist working from home).
// The therapists management module has been removed as it does not apply.
// All therapist-related functions (initTherapists, loadTherapists, saveTherapist,
// openTherapistModal, editTherapist, deleteTherapist, etc.) were deleted.
// The business hours module handles scheduling for the single therapist.
// ============================================

// Placeholder to keep file structure intact
function initTherapists() {
    // No-op: personal business
}

// Keep window exports to avoid errors if called from elsewhere
window.editTherapist = () => showNotification('Módulo deshabilitado: negocio personal', 'info');
window.deleteTherapist = () => showNotification('Módulo deshabilitado: negocio personal', 'info');

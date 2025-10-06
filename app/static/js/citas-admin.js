// citas_admin.js

function abrir(id) { document.getElementById(id)?.classList.remove('hidden'); }
function cerrar(id) { document.getElementById(id)?.classList.add('hidden'); }

async function cargarCitas() {
    try {
        const tbody = document.getElementById('citas-table-body');
        // Si no existe tbody dinÃ¡mico, no recargar (usa HTML del servidor)
        if (!tbody) return;
        const response = await fetch('/api/citas');
        const citas = await response.json();
        const totalCitas = document.getElementById('total-citas');
        tbody.innerHTML = '';
        if (!response.ok) {
            tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-4 text-center text-gray-400">Error al cargar citas: ${citas.error}</td></tr>`;
            totalCitas.textContent = '0';
            return;
        }
        if (citas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-4 text-center text-gray-400">No hay citas registradas.</td></tr>';
            totalCitas.textContent = '0';
            return;
        }
        citas.forEach((cita) => {
            const nombre = cita.nombre_cliente || (cita.usuario_nombre && cita.usuario_apellido ? `${cita.usuario_nombre} ${cita.usuario_apellido}` : '-');
            const tr = document.createElement('tr');
            tr.className = cita.estado === 'completado' ? 'bg-gray-950 opacity-70' : '';
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${cita.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                    ${cita.nombre_cliente && cita.nombre_cliente.trim() ? nombre : `<a href="/perfil/${cita.usuario_id}" class="text-gray-200 hover:text-gray-400 underline">${nombre}</a>`}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${cita.telefono_cliente || cita.usuario_telefono || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-fecha_creacion="${cita.fecha_creacion}">${new Date(cita.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-fecha_cita="${cita.fecha_cita}">${new Date(cita.fecha_cita).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-hora="${cita.hora}">${cita.hora_12h}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${cita.servicio_nombre || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-200">${cita.notas || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm" data-estado="${cita.estado}">
                    <select class="estado-cita text-white bg-gray-900 py-1 px-1 rounded-md border border-gray-600 text-sm focus:ring-rose-500 focus:border-rose-500"
                            data-cita-id="${cita.id}"
                            data-current-value="${cita.estado}"
                            onchange="actualizarEstadoCita(this)"
                            ${cita.estado === 'completado' ? 'disabled' : ''}>
                        <option value="pendiente" ${cita.estado === 'pendiente' ? 'selected' : ''} class="bg-orange-100 text-orange-500">Pendiente</option>
                        <option value="confirmado" ${cita.estado === 'confirmado' ? 'selected' : ''} class="bg-blue-300 text-blue-800">Confirmado</option>
                        <option value="cancelado" ${cita.estado === 'cancelado' ? 'selected' : ''} class="bg-red-300 text-red-800">Cancelado</option>
                        <option value="completado" ${cita.estado === 'completado' ? 'selected' : ''} class="bg-green-300 text-green-800">Completado</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });
        totalCitas.textContent = citas.length; // Set initial total count
        sortByDateAndTime();

        // Re-asignar eventos para botones de editar y eliminar (si se agregan en admin)
        document.querySelectorAll('.editar-cita').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('edit-id').value = btn.dataset.citaId;
                document.getElementById('edit-barbero').value = btn.dataset.barberoId || '';
                document.getElementById('edit-fecha_cita').value = btn.dataset.fechaCita || '';
                document.getElementById('edit-hora').value = btn.dataset.hora || '';
                document.getElementById('edit-servicio').value = btn.dataset.servicioId || '';
                document.getElementById('edit-notas').value = btn.dataset.notas || '';
                abrir('modal-editar-cita');
            });
        });
        document.querySelectorAll('.eliminar-cita').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('eliminar-id').value = btn.dataset.citaId;
                document.getElementById('eliminar-client-id-display').textContent = btn.dataset.clientCitaId;
                abrir('modal-eliminar-cita');
            });
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-4 text-center text-gray-400">Error al conectar con el servidor: ${error.message}</td></tr>`;
        document.getElementById('total-citas').textContent = '0';
    }
}

// Poblar dropdowns de barberos y servicios
async function cargarDropdowns() {
    try {
        const [barberosRes, serviciosRes] = await Promise.all([
            fetch('/api/barberos'),
            fetch('/api/servicios')
        ]);
        const barberos = await barberosRes.json();
        const servicios = await serviciosRes.json();
        const barberoSelect = document.getElementById('edit-barbero');
        const servicioSelect = document.getElementById('edit-servicio');
        barberoSelect.innerHTML = '<option value="">Seleccionar</option>' + 
            barberos.map(b => `<option value="${b.id}">${b.nombre} ${b.apellido}</option>`).join('');
        servicioSelect.innerHTML = '<option value="">Seleccionar</option>' + 
            servicios.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    } catch (error) {
        console.error('Error al cargar dropdowns:', error);
    }
}

// Editar cita
const modalEditar = document.getElementById('modal-editar-cita');
document.querySelectorAll('.cerrar-modal-editar').forEach(b => b.addEventListener('click', () => cerrar('modal-editar-cita')));
modalEditar?.addEventListener('click', e => { if (e.target.id === 'modal-editar-cita') cerrar('modal-editar-cita'); });

document.getElementById('form-cita-editar')?.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch(`/api/citas/${formData.get('id')}`, {
            method: 'PUT',
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            alert('Â¡Cita actualizada correctamente!');
            cerrar('modal-editar-cita');
            cargarCitas();
        } else {
            alert('Error al actualizar la cita: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Eliminar cita
document.querySelectorAll('.cerrar-modal-eliminar').forEach(b => b.addEventListener('click', () => cerrar('modal-eliminar-cita')));
document.getElementById('modal-eliminar-cita')?.addEventListener('click', e => { if (e.target.id === 'modal-eliminar-cita') cerrar('modal-eliminar-cita'); });

document.getElementById('form-cita-eliminar')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('eliminar-id').value;
    try {
        const response = await fetch(`/api/citas/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (response.ok) {
            alert('Â¡Cita eliminada correctamente!');
            cerrar('modal-eliminar-cita');
            cargarCitas();
        } else {
            alert('Error al eliminar la cita: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Restricciones para el calendario: solo lunes a viernes, mÃ­nimo hoy, mÃ¡ximo hoy + 1 mes
function setupDateRestrictions() {
    const dateInput = document.getElementById('edit-fecha_cita');
    if (dateInput) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        dateInput.min = todayStr;
        const maxDate = new Date();
        maxDate.setMonth(today.getMonth() + 1);
        const maxDateStr = maxDate.toISOString().split('T')[0];
        dateInput.max = maxDateStr;
        dateInput.addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            const day = selectedDate.getDay();
            if (day === 5 || day === 6) {
                alert('Solo se pueden reservar citas de lunes a viernes.');
                this.value = '';
            }
        });
    }
}

// Admin-specific functionality
document.addEventListener('DOMContentLoaded', () => {
    cargarCitas();
    cargarDropdowns();
    setupDateRestrictions();

    const table = document.getElementById('citas-table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    const searchInput = document.getElementById('search-input');
    const totalCitas = document.getElementById('total-citas');
    const filterToggle = document.getElementById('filter-toggle');
    const filterPopover = document.getElementById('filter-popover');
    const closeFilterPopover = document.getElementById('close-filter-popover');
    const orderToggle = document.getElementById('order-toggle');
    const orderIcon = document.getElementById('order-icon');
    const dateFilter = document.getElementById('date-filter');
    const clearDateFilter = document.getElementById('clear-date-filter');
    const statusFilter = document.getElementById('status-filter');

    if (searchInput) { // Admin page
        let searchTerm = '';
        let filterStatus = '';
        let filterDate = '';
        let orderByDateDesc = true; // Default: MÃ¡s reciente primero

        function updateCount() {
            const visibleRows = Array.from(tbody.querySelectorAll('tr:not(.hidden)')).filter(tr => !tr.querySelector('td[colspan]'));
            totalCitas.textContent = visibleRows.length;
        }

        function applyFiltersAndSort() {
            const rows = Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.querySelector('td[colspan]'));
            rows.forEach(tr => {
                let show = true;
                if (searchTerm) {
                    const text = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.toLowerCase()).join(' ');
                    show = show && text.includes(searchTerm);
                }
                if (filterStatus) {
                    const estado = tr.querySelector('[data-estado]').dataset.estado;
                    show = show && (estado === filterStatus);
                }
                if (filterDate) {
                    const fechaCita = tr.querySelector('[data-fecha_cita]').dataset.fecha_cita;
                    show = show && (fechaCita === filterDate);
                }
                tr.classList.toggle('hidden', !show);
            });

            // Sort visible rows
            const visibleRows = Array.from(tbody.querySelectorAll('tr:not(.hidden)')).filter(tr => !tr.querySelector('td[colspan]'));
            visibleRows.sort((a, b) => {
                const fechaA = new Date(a.querySelector('[data-fecha_cita]').dataset.fecha_cita);
                const fechaB = new Date(b.querySelector('[data-fecha_cita]').dataset.fecha_cita);
                const horaA = a.querySelector('[data-hora]').dataset.hora;
                const horaB = b.querySelector('[data-hora]').dataset.hora;
                const estadoA = a.querySelector('[data-estado]').dataset.estado;
                const estadoB = b.querySelector('[data-estado]').dataset.estado;

                // Sort by fecha_cita
                if (orderByDateDesc) {
                    if (fechaA > fechaB) return -1;
                    if (fechaA < fechaB) return 1;
                } else {
                    if (fechaA < fechaB) return -1;
                    if (fechaA > fechaB) return 1;
                }

                // Within same date, sort by hora
                if (orderByDateDesc) {
                    if (horaA > horaB) return -1;
                    if (horaA < horaB) return 1;
                } else {
                    if (horaA < horaB) return -1;
                    if (horaA > horaB) return 1;
                }

                // Within same date and time, completed goes last
                if (estadoA === 'completado' && estadoB !== 'completado') return 1;
                if (estadoB === 'completado' && estadoA !== 'completado') return -1;

                return 0;
            });

            visibleRows.forEach(row => tbody.appendChild(row));
            updateCount();
        }

        function sortByDateAndTime() {
            const rows = Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.querySelector('td[colspan]'));
            rows.sort((a, b) => {
                const fechaA = new Date(a.querySelector('[data-fecha_cita]').dataset.fecha_cita);
                const fechaB = new Date(b.querySelector('[data-fecha_cita]').dataset.fecha_cita);
                const horaA = a.querySelector('[data-hora]').dataset.hora;
                const horaB = b.querySelector('[data-hora]').dataset.hora;
                const estadoA = a.querySelector('[data-estado]').dataset.estado;
                const estadoB = b.querySelector('[data-estado]').dataset.estado;

                // Sort by fecha_cita
                if (orderByDateDesc) {
                    if (fechaA > fechaB) return -1;
                    if (fechaA < fechaB) return 1;
                } else {
                    if (fechaA < fechaB) return -1;
                    if (fechaA > fechaB) return 1;
                }

                // Within same date, sort by hora
                if (orderByDateDesc) {
                    if (horaA > horaB) return -1;
                    if (horaA < horaB) return 1;
                } else {
                    if (horaA < horaB) return -1;
                    if (horaA > horaB) return 1;
                }

                // Within same date and time, completed goes last
                if (estadoA === 'completado' && estadoB !== 'completado') return 1;
                if (estadoB === 'completado' && estadoA !== 'completado') return -1;

                return 0;
            });
            rows.forEach(row => tbody.appendChild(row));
            updateCount();
        }

        // Popover positioning
        filterToggle.addEventListener('click', () => {
            // Show popover to calculate width
            filterPopover.classList.remove('hidden');
            // Use setTimeout to ensure width is calculated after display
            setTimeout(() => {
                const rect = filterToggle.getBoundingClientRect();
                const popoverWidth = filterPopover.offsetWidth;
                let leftPos = rect.right - popoverWidth;
                // Ensure popover stays within window bounds
                if (leftPos < 10) {
                    leftPos = 10; // 10px margin from left
                } else if (leftPos + popoverWidth > window.innerWidth - 10) {
                    leftPos = window.innerWidth - popoverWidth - 10; // 10px margin from right
                }
                filterPopover.style.top = `${rect.bottom + window.scrollY + 5}px`; // 5px offset below button
                filterPopover.style.left = `${leftPos + window.scrollX}px`;
                // Center on mobile
                if (window.innerWidth < 640) {
                    filterPopover.style.left = '50%';
                    filterPopover.style.transform = 'translateX(-50%)';
                } else {
                    filterPopover.style.transform = 'none';
                }
            }, 0);
        });

        // Close popover on click outside or close button
        closeFilterPopover.addEventListener('click', () => cerrar('filter-popover'));
        filterPopover.addEventListener('click', e => {
            if (e.target.id === 'filter-popover') cerrar('filter-popover');
        });

        // Order toggle
        orderToggle?.addEventListener('click', () => {
            orderByDateDesc = !orderByDateDesc;
            orderToggle.querySelector('span').textContent = orderByDateDesc ? 'MÃ¡s reciente primero' : 'MÃ¡s antiguo primero';
            orderIcon.innerHTML = orderByDateDesc ? '<path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m0 0l-4-4m4 4l4-4"/>' : '<path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5m0 0l4 4m-4-4l-4 4"/>';
            applyFiltersAndSort();
        });

        // Search
        searchInput.addEventListener('input', () => {
            searchTerm = searchInput.value.toLowerCase();
            applyFiltersAndSort();
        });

        // Status filter
        statusFilter.addEventListener('change', () => {
            filterStatus = statusFilter.value;
            applyFiltersAndSort();
        });

        // Date filter
        dateFilter.addEventListener('change', () => {
            filterDate = dateFilter.value;
            applyFiltersAndSort();
        });

        // Clear date filter
        clearDateFilter.addEventListener('click', () => {
            dateFilter.value = '';
            filterDate = '';
            applyFiltersAndSort();
        });

        // Column sorting
        window.sortTable = function(field) {
            const th = Array.from(table.querySelectorAll('th')).find(t => t.onclick && t.onclick.toString().includes(`'${field}'`));
            if (!th) return;
            const ascPath = th.querySelector(`#sort-${field}-asc`);
            const descPath = th.querySelector(`#sort-${field}-desc`);
            const wasAsc = !ascPath.classList.contains('hidden');
            const wasDesc = !descPath.classList.contains('hidden');
            let isDesc;
            if (!wasAsc && !wasDesc) {
                ascPath.classList.remove('hidden');
                descPath.classList.add('hidden');
                isDesc = false;
            } else if (wasAsc) {
                ascPath.classList.add('hidden');
                descPath.classList.remove('hidden');
                isDesc = true;
            } else {
                ascPath.classList.remove('hidden');
                descPath.classList.add('hidden');
                isDesc = false;
            }
            table.querySelectorAll('th svg path:not(.hidden)').forEach(p => {
                if (p !== ascPath && p !== descPath) p.classList.add('hidden');
            });

            const rows = Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.querySelector('td[colspan]') && !tr.classList.contains('hidden'));

            const getValue = (tr) => {
                if (field === 'fecha_creacion' || field === 'fecha_cita') {
                    return tr.querySelector(`[data-${field}]`).dataset[field];
                } else if (field === 'servicio') {
                    return tr.querySelector('td:nth-child(7)').textContent.trim();
                } else if (field === 'estado') {
                    return tr.querySelector('[data-estado]').dataset.estado;
                }
            };

            rows.sort((a, b) => {
                let va = getValue(a);
                let vb = getValue(b);
                if (field.includes('fecha')) {
                    va = new Date(va);
                    vb = new Date(vb);
                    return isDesc ? (vb - va) : (va - vb);
                } else {
                    return isDesc ? vb.localeCompare(va) : va.localeCompare(vb);
                }
            });

            rows.forEach(row => tbody.appendChild(row));
            updateCount();
        };

        // Status update
        let pagoContext = { select: null, citaId: null, total: 0 };

        async function fetchResumen(citaId) {
            const res = await fetch(`/api/citas/${citaId}/resumen`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        }

        function formatear(valor) {
            return `$${Number(valor || 0).toFixed(2)}`;
        }

        function abrirModalPago(data, select) {
            pagoContext = { select, citaId: data.cita_id, total: Number(data.total || 0) };
            const modal = document.getElementById('modal-pago-cita');
            const elCliente = document.getElementById('pago-cliente');
            const elFecha = document.getElementById('pago-fecha');
            const itemsTbody = document.getElementById('pago-items');
            const elSubtotal = document.getElementById('pago-subtotal');
            const elDesc = document.getElementById('pago-descuento');
            const elTotal = document.getElementById('pago-total');
            const elTransferido = document.getElementById('pago-transferido');
            const elSaldo = document.getElementById('pago-saldo');

            elCliente.textContent = `${data.cliente?.nombre || ''} ${data.cliente?.apellido || ''}`.trim() || '-';
            const fecha = new Date(`${data.fecha}T${data.hora}:00`);
            const fechaStr = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric'}) + ' ' + 
              fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            elFecha.textContent = fechaStr;

            itemsTbody.innerHTML = '';
            (data.items || []).forEach(it => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                  <td class="py-1 pr-2">${it.tipo === 'principal' ? 'Servicio' : 'Adicional'}: ${it.nombre || '-'}</td>
                  <td class="py-1 text-right">${formatear(it.precio_base)}</td>
                  <td class="py-1 text-right">-${formatear(it.descuento)}</td>
                  <td class="py-1 text-right">${formatear(it.precio_final)}</td>
                `;
                itemsTbody.appendChild(tr);
            });
            elSubtotal.textContent = formatear(data.subtotal);
            elDesc.textContent = `-${formatear(data.descuento_total)}`;
            elTotal.textContent = formatear(data.total);
            if (elTransferido) {
                elTransferido.value = formatear(data.transferido);
            }
            if (elSaldo) {
                const saldoValor = Object.prototype.hasOwnProperty.call(data, 'saldo') ? data.saldo : data.total;
                elSaldo.textContent = `Saldo: ${formatear(saldoValor)}`;
            }

            modal.classList.remove('hidden');

        }

        async function completarCita(citaId, select) {
            const response = await fetch(`/api/citas/${citaId}/estado`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'completado' })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error desconocido');
            select.dataset.currentValue = 'completado';
            select.parentNode.dataset.estado = 'completado';
            const tr = select.closest('tr');
            select.disabled = true;
            select.classList.add('opacity-50', 'cursor-not-allowed');
            tr.classList.add('bg-gray-950', 'opacity-70');
            applyFiltersAndSort();
        }

        // Eventos modal
        (function initPagoModalEvents(){
            const modal = document.getElementById('modal-pago-cita');
            if (!modal) return;
            const btnCerrar = document.getElementById('pago-close');
            const btnCancel = document.getElementById('pago-cancel');
            const btnAceptar = document.getElementById('pago-aceptar');
            const btnDescargar = document.getElementById('pago-descargar');
            let lastPagoId = null;
            async function crearPagoSiNecesario() {
                if (lastPagoId) return lastPagoId;
                const metodo = document.getElementById('pago-metodo')?.value || 'efectivo';
                const recibido = null;
                const resPago = await fetch('/api/pagos', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cita_id: pagoContext.citaId, metodo, monto_recibido: recibido })
                });
                const dataPago = await resPago.json();
                if (!resPago.ok) throw new Error(dataPago.error || 'No se pudo registrar el pago');
                lastPagoId = dataPago?.pago?.id || null;
                return lastPagoId;
            }
            btnDescargar?.addEventListener('click', async () => {
                try {
                    const pid = await crearPagoSiNecesario();
                    if (pid) window.open(`/facturas/${pid}/descargar`, '_blank');
                } catch (e) {
                    alert(`Error al generar factura: ${e.message}`);
                }
            });

            const cerrarModal = () => modal.classList.add('hidden');
            btnCerrar?.addEventListener('click', () => {
                cerrarModal();
                if (pagoContext.select) pagoContext.select.value = pagoContext.select.dataset.currentValue;
            });
            btnCancel?.addEventListener('click', () => {
                cerrarModal();
                if (pagoContext.select) pagoContext.select.value = pagoContext.select.dataset.currentValue;
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cerrarModal();
                    if (pagoContext.select) pagoContext.select.value = pagoContext.select.dataset.currentValue;
                }
            });
            btnAceptar?.addEventListener('click', async () => {
                try {
                    // Registrar pago informativo antes de completar
                    const metodo = document.getElementById('pago-metodo')?.value || 'efectivo';
                    const recibido = null;
                    try {
                        const resPago = await fetch('/api/pagos', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                cita_id: pagoContext.citaId,
                                metodo,
                                monto_recibido: recibido
                            })
                        });
                        const dataPago = await resPago.json();
                        if (!resPago.ok) throw new Error(dataPago.error || 'No se pudo registrar el pago');
                    } catch (e) {
                        alert(`Error al registrar el pago: ${e.message}`);
                        return;
                    }

                    // Completar cita
                    await completarCita(pagoContext.citaId, pagoContext.select);
                    cerrarModal();
                    // NotificaciÃ³n simple
                    alert('Cita completada y pago registrado.');
                } catch (err) {
                    alert(`Error al completar: ${err.message}`);
                }
            });
        })();

        window.actualizarEstadoCita = async function(select) {
            const oldValue = select.dataset.currentValue;
            const newValue = select.value;
            if (newValue === oldValue) return;
            // Interceptar cuando se selecciona 'completado'
            if (newValue === 'completado') {
                try {
                    const data = await fetchResumen(select.dataset.citaId);
                    abrirModalPago(data, select);
                } catch (error) {
                    alert(`No se pudo obtener el resumen: ${error.message}`);
                    select.value = oldValue;
                }
                return;
            }

            // Otras transiciones (pendiente/confirmado/cancelado) van directo
            try {
                const response = await fetch(`/api/citas/${select.dataset.citaId}/estado`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: newValue })
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Error desconocido');
                }
                select.dataset.currentValue = newValue;
                select.parentNode.dataset.estado = newValue;
                const tr = select.closest('tr');
                if (newValue === 'completado') {
                    select.disabled = true;
                    select.classList.add('opacity-50', 'cursor-not-allowed');
                    tr.classList.add('bg-gray-950', 'opacity-70');
                } else {
                    select.disabled = false;
                    select.classList.remove('opacity-50', 'cursor-not-allowed');
                    tr.classList.remove('bg-gray-950', 'opacity-70');
                }
                applyFiltersAndSort();
            } catch (error) {
                alert(`Error al actualizar estado: ${error.message}`);
                select.value = oldValue;
            }
        };

        // Initial sort and count
        applyFiltersAndSort();
    }
});

// Funciones de utilidad
function abrir(id) { document.getElementById(id)?.classList.remove('hidden'); }
function cerrar(id) { document.getElementById(id)?.classList.add('hidden'); }

// Función para cargar el historial de citas
async function cargarHistorial() {
    try {
        const response = await fetch('/api/historial');
        
        if (!response.ok) {
            throw new Error('Error al cargar historial: ' + (await response.json()).error || response.statusText);
        }
        
        const historial = await response.json();
        
        // Verificar si estamos en la vista de cliente o administrador
        const esAdmin = document.getElementById('historial-table-body') !== null;
        const tbody = esAdmin 
            ? document.getElementById('historial-table-body')
            : document.getElementById('historial-cliente-body');
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (historial.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${esAdmin ? 7 : 5}" class="px-6 py-4 text-center text-gray-500">No hay citas completadas en el historial.</td></tr>`;
            
            if (esAdmin && document.getElementById('total-historial')) {
                document.getElementById('total-historial').textContent = '0';
            }
            return;
        }
        
        // Generar filas según el tipo de vista
        historial.forEach(cita => {
            const tr = document.createElement('tr');
            
            if (esAdmin) {
                // Vista de administrador
                const nombreCliente = cita.nombre_cliente || 
                    (cita.usuario_nombre && cita.usuario_apellido 
                        ? `${cita.usuario_nombre} ${cita.usuario_apellido}` 
                        : '-');
                        
                tr.className = "";
                tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${cita.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        ${cita.nombre_cliente 
                            ? nombreCliente 
                            : `<a href="/perfil/${cita.usuario_id}" class="text-gray-200 hover:text-gray-400 underline">${nombreCliente}</a>`
                        }
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-fecha_cita="${cita.fecha_cita}">
                        ${cita.fecha_cita_formato}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-hora="${cita.hora}">
                        ${cita.hora_12h}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        ${cita.servicio_nombre || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-fecha_completado="${cita.fecha_completado}">
                        ${cita.fecha_completado_formato}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-200">
                        ${cita.notas || '-'}
                    </td>
                `;
            } else {
                // Vista de cliente
                tr.className = "";
                tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${cita.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        ${cita.nombre_cliente || `${cita.usuario_nombre} ${cita.usuario_apellido}`}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        <a href="/perfil/${cita.barbero_id}" class="text-gray-200 hover:text-gray-400 underline">
                            ${cita.barbero_nombre} ${cita.barbero_apellido}
                        </a>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-fecha_cita="${cita.fecha_cita}">
                        ${cita.fecha_cita_formato}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-hora="${cita.hora}">
                        ${cita.hora_12h}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        ${cita.servicio_nombre || '-'}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-200">
                        ${cita.notas || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-fecha_completado="${cita.fecha_completado}">
                        ${new Date(cita.fecha_completado).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'America/Bogota'
                        })}
                    </td>
                `;
            }
            
            tbody.appendChild(tr);
        });
        
        // Actualizar contador para admin
        if (esAdmin && document.getElementById('total-historial')) {
            document.getElementById('total-historial').textContent = historial.length;
            setupAdminFilters();
        }
        
    } catch (error) {
        console.error("Error en cargarHistorial:", error);
        
        const esAdmin = document.getElementById('historial-table-body') !== null;
        const tbody = esAdmin 
            ? document.getElementById('historial-table-body')
            : document.getElementById('historial-cliente-body');
        
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="${esAdmin ? 7 : 5}" class="px-6 py-4 text-center text-gray-500">Error al conectar con el servidor: ${error.message}</td></tr>`;
        }
        
        if (esAdmin && document.getElementById('total-historial')) {
            document.getElementById('total-historial').textContent = '0';
        }
    }
}

// Configurar filtros y búsqueda para la vista de administrador
function setupAdminFilters() {
    const searchInput = document.getElementById('search-input');
    const filterToggle = document.getElementById('filter-toggle');
    const filterPopover = document.getElementById('filter-popover');
    const closeFilterPopover = document.getElementById('close-filter-popover');
    const orderToggle = document.getElementById('order-toggle');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    const clearDateFilter = document.getElementById('clear-date-filter');
    
    if (!searchInput) return; // No estamos en la vista de admin
    
    // Variables para los filtros
    let searchTerm = '';
    let orderByDateDesc = true; // Default: Más reciente primero
    let filterDateFrom = '';
    let filterDateTo = '';
    
    // Función para actualizar el contador
    function updateCount() {
        const visibleRows = Array.from(document.getElementById('historial-table-body').querySelectorAll('tr:not(.hidden)')).filter(tr => !tr.querySelector('td[colspan]'));
        document.getElementById('total-historial').textContent = visibleRows.length;
    }
    
    // Función para aplicar filtros
    function applyFilters() {
        const tbody = document.getElementById('historial-table-body');
        const rows = Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.querySelector('td[colspan]'));
        
        rows.forEach(tr => {
            let show = true;
            
            // Filtro de búsqueda
            if (searchTerm) {
                const text = tr.textContent.toLowerCase();
                show = show && text.includes(searchTerm);
            }
            
            // Filtro de fecha desde
            if (filterDateFrom) {
                const fechaCita = tr.querySelector('[data-fecha_cita]')?.dataset.fecha_cita;
                show = show && fechaCita && (fechaCita >= filterDateFrom);
            }
            
            // Filtro de fecha hasta
            if (filterDateTo) {
                const fechaCita = tr.querySelector('[data-fecha_cita]')?.dataset.fecha_cita;
                show = show && fechaCita && (fechaCita <= filterDateTo);
            }
            
            tr.classList.toggle('hidden', !show);
        });
        
        // Ordenar filas visibles
        const visibleRows = Array.from(tbody.querySelectorAll('tr:not(.hidden)')).filter(tr => !tr.querySelector('td[colspan]'));
        
        visibleRows.sort((a, b) => {
            const fechaA = a.querySelector('[data-fecha_cita]')?.dataset.fecha_cita || '';
            const fechaB = b.querySelector('[data-fecha_cita]')?.dataset.fecha_cita || '';
            
            if (orderByDateDesc) {
                return fechaB.localeCompare(fechaA);
            } else {
                return fechaA.localeCompare(fechaB);
            }
        });
        
        visibleRows.forEach(row => tbody.appendChild(row));
        updateCount();
    }
    
    // Mostrar/ocultar popover de filtros
    filterToggle.addEventListener('click', function() {
        console.log("Filter toggle clicked");
        if (filterPopover.classList.contains('hidden')) {
            abrir('filter-popover');
            
            // Posicionar el popover
            const rect = filterToggle.getBoundingClientRect();
            filterPopover.style.top = `${rect.bottom + window.scrollY + 8}px`;
            
            // Alinear a la derecha para escritorio, centrar para móvil
            if (window.innerWidth >= 640) {
                filterPopover.style.right = `${window.innerWidth - rect.right - 8}px`;
                filterPopover.style.left = 'auto';
                filterPopover.style.transform = 'none';
            } else {
                filterPopover.style.left = '50%';
                filterPopover.style.right = 'auto';
                filterPopover.style.transform = 'translateX(-50%)';
            }
        } else {
            cerrar('filter-popover');
        }
    });
    
    // Cerrar popover
    closeFilterPopover.addEventListener('click', () => cerrar('filter-popover'));
    
    // Cerrar popover al hacer clic fuera
    document.addEventListener('click', function(event) {
        if (!filterPopover.contains(event.target) && 
            event.target !== filterToggle && 
            !filterPopover.classList.contains('hidden')) {
            cerrar('filter-popover');
        }
    });
    
    // Cambiar orden
    orderToggle.addEventListener('click', function() {
        orderByDateDesc = !orderByDateDesc;
        const spanEl = orderToggle.querySelector('span');
        if (spanEl) {
            spanEl.textContent = orderByDateDesc ? 'Más reciente primero' : 'Más antiguo primero';
        }
        applyFilters();
    });
    
    // Búsqueda
    searchInput.addEventListener('input', function() {
        searchTerm = searchInput.value.toLowerCase();
        applyFilters();
    });
    
    // Filtro de fecha desde
    dateFrom.addEventListener('change', function() {
        filterDateFrom = dateFrom.value;
        applyFilters();
    });
    
    // Filtro de fecha hasta
    dateTo.addEventListener('change', function() {
        filterDateTo = dateTo.value;
        applyFilters();
    });
    
    // Limpiar filtros de fecha
    clearDateFilter.addEventListener('click', function() {
        dateFrom.value = '';
        dateTo.value = '';
        filterDateFrom = '';
        filterDateTo = '';
        applyFilters();
    });
}

// Cargar historial al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log("Cargando historial...");
    cargarHistorial();
});
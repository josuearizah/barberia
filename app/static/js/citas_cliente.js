function abrir(id) { document.getElementById(id)?.classList.remove('hidden'); }
function cerrar(id) { document.getElementById(id)?.classList.add('hidden'); }

async function cargarCitas() {
    try {
        const response = await fetch('/api/citas');
        const citas = await response.json();
        const tbody = document.getElementById('citas-table-body');
        tbody.innerHTML = '';
        if (!response.ok) {
            tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-4 text-center text-gray-400">Error al cargar citas: ${citas.error}</td></tr>`;
            return;
        }
        if (citas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="px-6 py-4 text-center text-gray-400">No hay citas registradas.</td></tr>';
            return;
        }
        citas.forEach((cita) => {
            const nombre = cita.nombre_cliente || (cita.usuario_nombre && cita.usuario_apellido ? `${cita.usuario_nombre} ${cita.usuario_apellido}` : '-');
            const barbero = cita.barbero_nombre && cita.barbero_apellido ? `<a href="/perfil/${cita.barbero_id}" class="text-gray-200 hover:text-gray-400 underline">${cita.barbero_nombre} ${cita.barbero_apellido}</a>` : '-';
            const estado = cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1);
            const tr = document.createElement('tr');
            tr.className = cita.estado === 'completado' ? 'bg-gray-950 opacity-70' : '';
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${cita.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${nombre}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${barbero}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-fecha_creacion="${cita.fecha_creacion}">${new Date(cita.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-fecha_cita="${cita.fecha_cita}">${new Date(cita.fecha_cita).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-hora="${cita.hora}">${cita.hora_12h}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                    ${cita.servicio_nombre || '-'}
                    ${cita.servicio_adicional_nombre ? `<span class="text-gray-400"> + </span>${cita.servicio_adicional_nombre}` : ''}
                </td>
                <td class="px-6 py-4 text-sm text-gray-200">${cita.notas || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200" data-estado="${cita.estado}">${estado}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                    ${cita.estado !== 'completado' ? `
                    <button class="editar-cita text-blue-400 hover:text-blue-300 mr-3" 
                            data-cita-id="${cita.id}" 
                            data-client-cita-id="${cita.id}"
                            data-barbero-id="${cita.barbero_id || ''}"
                            data-fecha-cita="${cita.fecha_cita}"
                            data-hora="${cita.hora}"
                            data-servicio-id="${cita.servicio_id || ''}"
                            data-notas="${cita.notas || ''}"
                            title="Editar">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 3.487l2.651 2.651a2.25 2.25 0 010 3.182L9.41 19.425l-4.682 1.02 1.02-4.682 10.103-10.105a2.25 2.25 0 013.182 0z"/>
                        </svg>
                    </button>
                    <button class="eliminar-cita text-red-400 hover:text-red-300" 
                            data-cita-id="${cita.id}" 
                            data-client-cita-id="${cita.id}"
                            title="Eliminar">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"/>
                        </svg>
                    </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Wire up event listeners for edit and delete buttons
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
        tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-4 text-center text-gray-400">Error al conectar con el servidor: ${error.message}</td></tr>`;
    }
}

// Populate dropdowns for barbers and services
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

// Handle edit form submission
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
            alert('¡Cita actualizada correctamente!');
            cerrar('modal-editar-cita');
            cargarCitas();
        } else {
            alert('Error al actualizar la cita: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Handle delete form submission
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
            alert('¡Cita eliminada correctamente!');
            cerrar('modal-eliminar-cita');
            cargarCitas();
        } else {
            alert('Error al eliminar la cita: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Date restrictions: Monday to Friday, min today, max today + 1 month
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
            if (day === 0 || day === 6) {
                alert('Solo se pueden reservar citas de lunes a viernes.');
                this.value = '';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarCitas();
    cargarDropdowns();
    setupDateRestrictions();
});

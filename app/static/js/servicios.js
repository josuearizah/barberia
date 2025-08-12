function abrir(id) { document.getElementById(id).classList.remove('hidden'); }
function cerrar(id) { document.getElementById(id).classList.add('hidden'); }

async function cargarServicios() {
    try {
        const response = await fetch('/api/servicios');
        const servicios = await response.json();
        const tbody = document.querySelector('tbody');
        tbody.innerHTML = '';
        if (!response.ok) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-400">Error al cargar servicios: ' + servicios.error + '</td></tr>';
            return;
        }
        if (servicios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-400">No hay servicios registrados.</td></tr>';
            return;
        }
        servicios.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${s.id}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${s.nombre}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                    ${s.imagen_url ? `<img src="${s.imagen_url}" alt="${s.nombre}" class="h-12 w-12 object-contain rounded-md border border-gray-700">` : '<span class="text-gray-500 italic">Sin imagen</span>'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-200 max-w-xs truncate" title="${s.descripcion || ''}">${s.descripcion || '-'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">$${s.precio}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${s.duracion} min</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                    <div class="flex items-center gap-3 justify-center">
                        <button class="btn-editar-servicio text-blue-400 hover:text-blue-300" title="Editar" 
                                data-id="${s.id}" data-nombre="${s.nombre}" data-descripcion="${s.descripcion || ''}" 
                                data-precio="${s.precio}" data-duracion="${s.duracion}" data-imagen="${s.imagen_url || ''}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 3.487l2.651 2.651a2.25 2.25 0 010 3.182L9.41 19.425l-4.682 1.02 1.02-4.682 10.103-10.105a2.25 2.25 0 013.182 0z"/>
                            </svg>
                        </button>
                        <button class="btn-eliminar-servicio text-red-400 hover:text-red-300" title="Eliminar" 
                                data-id="${s.id}" data-nombre="${s.nombre}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"/>
                            </svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Re-asignar eventos para botones de editar y eliminar
        document.querySelectorAll('.btn-editar-servicio').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('edit-id').value = btn.dataset.id;
                document.getElementById('edit-nombre').value = btn.dataset.nombre || '';
                document.getElementById('edit-descripcion').value = btn.dataset.descripcion || '';
                document.getElementById('edit-precio').value = btn.dataset.precio || '';
                document.getElementById('edit-duracion').value = btn.dataset.duracion || '';
                const imgUrl = btn.dataset.imagen;
                const previewWrapper = document.getElementById('preview-imagen-actual');
                const imgEl = document.getElementById('img-actual');
                if (imgUrl) {
                    imgEl.src = imgUrl;
                    previewWrapper.hidden = false;
                } else {
                    previewWrapper.hidden = true;
                }
                abrir('modal-editar-servicio');
            });
        });
        document.querySelectorAll('.btn-eliminar-servicio').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('eliminar-id').value = btn.dataset.id;
                document.getElementById('eliminar-nombre').textContent = btn.dataset.nombre;
                abrir('modal-eliminar-servicio');
            });
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-400">Error al conectar con el servidor: ' + error.message + '</td></tr>';
    }
}

// Añadir servicio
document.getElementById('btn-abrir-modal-servicio')?.addEventListener('click', () => abrir('modal-servicio'));
document.getElementById('cerrar-modal-servicio')?.addEventListener('click', () => cerrar('modal-servicio'));
document.querySelectorAll('.btn-cerrar-add').forEach(b => b.addEventListener('click', () => cerrar('modal-servicio')));
document.getElementById('modal-servicio')?.addEventListener('click', e => { if (e.target.id === 'modal-servicio') cerrar('modal-servicio'); });

document.getElementById('form-servicio-nuevo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/servicios', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            alert('¡Servicio añadido correctamente!');
            cerrar('modal-servicio');
            cargarServicios();
        } else {
            alert('Error al añadir el servicio: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Editar servicio
const modalEditar = document.getElementById('modal-editar-servicio');
document.querySelectorAll('.cerrar-modal-editar').forEach(b => b.addEventListener('click', () => cerrar('modal-editar-servicio')));
modalEditar?.addEventListener('click', e => { if (e.target.id === 'modal-editar-servicio') cerrar('modal-editar-servicio'); });

document.getElementById('form-servicio-editar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`/api/servicios/${formData.get('id')}`, {
            method: 'PUT',
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            alert('¡Servicio actualizado correctamente!');
            cerrar('modal-editar-servicio');
            cargarServicios();
        } else {
            alert('Error al actualizar el servicio: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Eliminar servicio
document.querySelectorAll('.cerrar-modal-eliminar').forEach(b => b.addEventListener('click', () => cerrar('modal-eliminar-servicio')));
document.getElementById('modal-eliminar-servicio')?.addEventListener('click', e => { if (e.target.id === 'modal-eliminar-servicio') cerrar('modal-eliminar-servicio'); });

document.getElementById('form-servicio-eliminar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('eliminar-id').value;
    
    try {
        const response = await fetch(`/api/servicios/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (response.ok) {
            alert('¡Servicio eliminado correctamente!');
            cerrar('modal-eliminar-servicio');
            cargarServicios();
        } else {
            alert('Error al eliminar el servicio: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Cargar servicios al iniciar la página
document.addEventListener('DOMContentLoaded', cargarServicios);
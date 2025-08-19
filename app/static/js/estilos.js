function abrir(id) { document.getElementById(id)?.classList.remove('hidden'); }
function cerrar(id) { document.getElementById(id)?.classList.add('hidden'); }

async function cargarEstilos() {
    try {
        const response = await fetch('/api/estilos');
        const estilos = await response.json();
        const tbody = document.getElementById('tabla-estilos-body');
        tbody.innerHTML = '';
        if (!response.ok) {
            tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-400">Error al cargar estilos: ${estilos.error}</td></tr>`;
            return;
        }
        if (estilos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-400">No hay estilos registrados.</td></tr>';
            return;
        }
        estilos.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${e.id}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${e.nombre}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                    ${e.imagen_url ? `<img src="${e.imagen_url}" alt="${e.nombre}" class="h-12 w-12 object-contain rounded-md border border-gray-700">` : '<span class="text-gray-500 italic">Sin imagen</span>'}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200 capitalize">${e.categoria}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200 text-center">
                    <input type="checkbox" class="toggle-activo" data-id="${e.id}" ${e.activo ? 'checked' : ''}>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                    <div class="flex items-center gap-3 justify-center">
                        <button class="btn-editar-estilo text-blue-400 hover:text-blue-300" title="Editar" 
                                data-id="${e.id}" data-nombre="${e.nombre}" data-categoria="${e.categoria}" 
                                data-imagen="${e.imagen_url || ''}" data-activo="${e.activo}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 3.487l2.651 2.651a2.25 2.25 0 010 3.182L9.41 19.425l-4.682 1.02 1.02-4.682 10.103-10.105a2.25 2.25 0 013.182 0z"/>
                            </svg>
                        </button>
                        <button class="btn-eliminar-estilo text-red-400 hover:text-red-300" title="Eliminar" 
                                data-id="${e.id}" data-nombre="${e.nombre}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"/>
                            </svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Re-asignar eventos para botones de editar, eliminar y toggle
        document.querySelectorAll('.btn-editar-estilo').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('edit-id').value = btn.dataset.id;
                document.getElementById('edit-nombre').value = btn.dataset.nombre || '';
                document.getElementById('edit-categoria').value = btn.dataset.categoria || '';
                document.getElementById('edit-activo').checked = btn.dataset.activo === 'true';
                const imgUrl = btn.dataset.imagen;
                const previewWrapper = document.getElementById('preview-imagen-actual');
                const imgEl = document.getElementById('img-actual');
                if (imgUrl) {
                    imgEl.src = imgUrl;
                    previewWrapper.hidden = false;
                } else {
                    previewWrapper.hidden = true;
                }
                abrir('modal-editar-estilo');
            });
        });
        document.querySelectorAll('.btn-eliminar-estilo').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('eliminar-id').value = btn.dataset.id;
                document.getElementById('eliminar-nombre').textContent = btn.dataset.nombre;
                abrir('modal-eliminar-estilo');
            });
        });
        document.querySelectorAll('.toggle-activo').forEach(chk => {
            chk.addEventListener('change', async () => {
                const id = chk.dataset.id;
                const estado = chk.checked;
                chk.disabled = true;
                try {
                    const response = await fetch(`/api/estilos/${id}/activo`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ activo: estado })
                    });
                    if (response.ok) {
                        alert(`Estado actualizado: ${estado ? 'Activo' : 'Inactivo'}`);
                    } else {
                        chk.checked = !estado;
                        alert('Error al cambiar el estado');
                    }
                } catch (error) {
                    chk.checked = !estado;
                    alert('Error al conectar con el servidor: ' + error.message);
                } finally {
                    chk.disabled = false;
                }
            });
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-400">Error al conectar con el servidor: ${error.message}</td></tr>`;
    }
}

// Añadir estilo
document.getElementById('btn-abrir-modal-estilo')?.addEventListener('click', () => abrir('modal-estilo'));
document.getElementById('cerrar-modal-estilo')?.addEventListener('click', () => cerrar('modal-estilo'));
document.querySelectorAll('.btn-cerrar-add').forEach(b => b.addEventListener('click', () => cerrar('modal-estilo')));
document.getElementById('modal-estilo')?.addEventListener('click', e => { if (e.target.id === 'modal-estilo') cerrar('modal-estilo'); });

document.getElementById('form-estilo-nuevo')?.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (!formData.get('activo')) formData.set('activo', 'off');
    try {
        const response = await fetch('/api/estilos', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            alert('¡Estilo añadido correctamente!');
            cerrar('modal-estilo');
            e.target.reset();
            cargarEstilos();
        } else {
            alert('Error al añadir el estilo: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Editar estilo
const modalEditar = document.getElementById('modal-editar-estilo');
document.querySelectorAll('.cerrar-modal-editar').forEach(b => b.addEventListener('click', () => cerrar('modal-editar-estilo')));
modalEditar?.addEventListener('click', e => { if (e.target.id === 'modal-editar-estilo') cerrar('modal-editar-estilo'); });

document.getElementById('form-estilo-editar')?.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (!formData.get('activo')) formData.set('activo', 'off');
    try {
        const response = await fetch(`/api/estilos/${formData.get('id')}`, {
            method: 'PUT',
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            alert('¡Estilo actualizado correctamente!');
            cerrar('modal-editar-estilo');
            cargarEstilos();
        } else {
            alert('Error al actualizar el estilo: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Eliminar estilo
document.querySelectorAll('.cerrar-modal-eliminar').forEach(b => b.addEventListener('click', () => cerrar('modal-eliminar-estilo')));
document.getElementById('modal-eliminar-estilo')?.addEventListener('click', e => { if (e.target.id === 'modal-eliminar-estilo') cerrar('modal-eliminar-estilo'); });

document.getElementById('form-estilo-eliminar')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('eliminar-id').value;
    try {
        const response = await fetch(`/api/estilos/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (response.ok) {
            alert('¡Estilo eliminado correctamente!');
            cerrar('modal-eliminar-estilo');
            cargarEstilos();
        } else {
            alert('Error al eliminar el estilo: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Cargar estilos al iniciar la página
document.addEventListener('DOMContentLoaded', cargarEstilos);
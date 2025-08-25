function abrir(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error(`Modal con ID ${id} no encontrado`);
    }
}

function cerrar(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
    } else {
        console.error(`Modal con ID ${id} no encontrado`);
    }
}

function formatDateLocal(date) {
    if (!date) return '';
    return date; // Ya viene en formato YYYY-MM-DD desde la API
}

function setupDescuentoLogic(precioInputId, context) {
    const precioInput = document.getElementById(precioInputId);
    const tipoSelect = document.getElementById('descuento-tipo-select');
    const porcentajeInput = document.getElementById('descuento-porcentaje');
    const cantidadInput = document.getElementById('descuento-cantidad');
    const precioFinalInput = document.getElementById('descuento-precio-final');
    const fechaInicioInput = document.getElementById('descuento-fecha-inicio');
    const fechaFinInput = document.getElementById('descuento-fecha-fin');

    if (!precioInput || !tipoSelect || !porcentajeInput || !cantidadInput || !precioFinalInput || !fechaInicioInput) {
        console.error('Elementos de descuento no encontrados');
        return;
    }

    function updatePrecioFinal() {
        const precio = parseFloat(precioInput.value) || 0;
        const tipo = tipoSelect.value;
        const porcentaje = parseFloat(porcentajeInput.value) || 0;
        const cantidad = parseFloat(cantidadInput.value) || 0;

        let precioFinal = precio;
        if (tipo === 'porcentaje' && porcentaje > 0) {
            precioFinal = precio * (1 - porcentaje / 100);
            cantidadInput.value = (precio * porcentaje / 100).toFixed(2);
        } else if (tipo === 'cantidad' && cantidad > 0) {
            precioFinal = precio - cantidad;
            porcentajeInput.value = precio > 0 ? ((cantidad / precio) * 100).toFixed(2) : '';
        } else {
            porcentajeInput.value = '';
            cantidadInput.value = '';
        }
        precioFinalInput.value = precioFinal >= 0 ? Math.round(precioFinal) : '';
    }

    precioInput.addEventListener('input', updatePrecioFinal);
    tipoSelect.addEventListener('change', () => {
        porcentajeInput.value = '';
        cantidadInput.value = '';
        updatePrecioFinal();
    });
    porcentajeInput.addEventListener('input', () => {
        if (tipoSelect.value === 'porcentaje') updatePrecioFinal();
    });
    cantidadInput.addEventListener('input', () => {
        if (tipoSelect.value === 'cantidad') updatePrecioFinal();
    });

    document.getElementById('form-descuento').addEventListener('submit', (e) => {
        e.preventDefault();
        const targetPrefix = context === 'nuevo' ? 'nuevo' : 'edit';
        document.getElementById(`${targetPrefix}-descuento-tipo`).value = tipoSelect.value;
        document.getElementById(`${targetPrefix}-descuento-valor`).value = tipoSelect.value === 'porcentaje' ? (parseFloat(porcentajeInput.value) || 0).toFixed(2) : (parseFloat(cantidadInput.value) || 0).toFixed(2);
        document.getElementById(`${targetPrefix}-descuento-fecha-inicio`).value = fechaInicioInput.value;
        document.getElementById(`${targetPrefix}-descuento-fecha-fin`).value = fechaFinInput.value || '';
        cerrar('modal-descuento');
    });

    const eliminarDescuentoBtn = document.getElementById('eliminar-descuento');
    if (eliminarDescuentoBtn) {
        eliminarDescuentoBtn.addEventListener('click', () => {
            const targetPrefix = context === 'nuevo' ? 'nuevo' : 'edit';
            document.getElementById(`${targetPrefix}-descuento-tipo`).value = '';
            document.getElementById(`${targetPrefix}-descuento-valor`).value = '';
            document.getElementById(`${targetPrefix}-descuento-fecha-inicio`).value = '';
            document.getElementById(`${targetPrefix}-descuento-fecha-fin`).value = '';
            cerrar('modal-descuento');
        });
    }
}

async function cargarServicios() {
    try {
        const response = await fetch('/api/servicios');
        const servicios = await response.json();
        const tbody = document.querySelector('tbody');
        if (!tbody) {
            console.error('No se encontró el elemento tbody');
            return;
        }
        tbody.innerHTML = '';
        if (!response.ok) {
            tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-gray-400">Error al cargar servicios: ${servicios.error}</td></tr>`;
            console.error('Error en la respuesta de la API:', servicios.error);
            return;
        }
        if (servicios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-4 text-center text-gray-400">No hay servicios registrados.</td></tr>';
            return;
        }
        // Reemplaza todo el bloque servicios.forEach con esto:
        servicios.forEach(s => {
            // Añadir console.log para depuración
            console.log(`Servicio ${s.id}:`, s);
            
            // Crear texto de descuento más informativo
            let descuentoText = '-';
            
            if (s.descuento) {
                console.log(`Descuento del servicio ${s.id}:`, s.descuento);
                
                if (s.descuento.tipo === 'porcentaje') {
                    descuentoText = `${Math.round(s.descuento.valor)}% → $${Math.round(s.descuento.precio_final)}`;
                } else if (s.descuento.tipo === 'cantidad') {
                    descuentoText = `$${Math.round(s.descuento.valor)} → $${Math.round(s.descuento.precio_final)}`;
                }
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${s.id}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${s.nombre}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                    ${s.imagen_url ? `<img src="${s.imagen_url}" alt="${s.nombre}" class="h-12 w-12 object-contain rounded-md border border-gray-700">` : '<span class="text-gray-500 italic">Sin imagen</span>'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-200 max-w-xs truncate" title="${s.descripcion || ''}">${s.descripcion || '-'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">$${Math.round(s.precio)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${s.duracion_minutos} min</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${descuentoText}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                    <div class="flex items-center gap-3 justify-center">
                        <button class="btn-editar-servicio text-blue-400 hover:text-blue-300" title="Editar" 
                                data-id="${s.id}" data-nombre="${s.nombre}" data-descripcion="${s.descripcion || ''}" 
                                data-precio="${s.precio}" data-duracion="${s.duracion_minutos}" 
                                data-imagen="${s.imagen_url || ''}" 
                                data-descuento-tipo="${s.descuento?.tipo || ''}"
                                data-descuento-valor="${s.descuento?.valor || ''}"
                                data-descuento-fecha-inicio="${s.descuento?.fecha_inicio || ''}"
                                data-descuento-fecha-fin="${s.descuento?.fecha_fin || ''}">
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

        document.querySelectorAll('.btn-editar-servicio').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('Botón editar clicado, ID:', btn.dataset.id);
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
                document.getElementById('edit-descuento-tipo').value = btn.dataset.descuentoTipo || '';
                document.getElementById('edit-descuento-valor').value = btn.dataset.descuentoValor || '';
                document.getElementById('edit-descuento-fecha-inicio').value = btn.dataset.descuentoFechaInicio || '';
                document.getElementById('edit-descuento-fecha-fin').value = btn.dataset.descuentoFechaFin || '';
                abrir('modal-editar-servicio');
            });
        });

        document.querySelectorAll('.btn-eliminar-servicio').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('Botón eliminar clicado, ID:', btn.dataset.id);
                document.getElementById('eliminar-id').value = btn.dataset.id;
                document.getElementById('eliminar-nombre').textContent = btn.dataset.nombre;
                abrir('modal-eliminar-servicio');
            });
        });
    } catch (error) {
        console.error('Error al cargar servicios:', error);
        const tbody = document.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-gray-400">Error al conectar con el servidor: ${error.message}</td></tr>`;
        }
    }
}

// Añadir servicio
const btnAbrirModalServicio = document.getElementById('btn-abrir-modal-servicio');
if (btnAbrirModalServicio) {
    btnAbrirModalServicio.addEventListener('click', () => {
        console.log('Botón añadir servicio clicado');
        document.getElementById('form-servicio-nuevo').reset();
        document.getElementById('nuevo-descuento-tipo').value = '';
        document.getElementById('nuevo-descuento-valor').value = '';
        document.getElementById('nuevo-descuento-fecha-inicio').value = '';
        document.getElementById('nuevo-descuento-fecha-fin').value = '';
        abrir('modal-servicio');
    });
} else {
    console.error('Botón btn-abrir-modal-servicio no encontrado');
}

const cerrarModalServicio = document.getElementById('cerrar-modal-servicio');
if (cerrarModalServicio) {
    cerrarModalServicio.addEventListener('click', () => cerrar('modal-servicio'));
} else {
    console.error('Botón cerrar-modal-servicio no encontrado');
}

document.querySelectorAll('.btn-cerrar-add').forEach(b => {
    b.addEventListener('click', () => cerrar('modal-servicio'));
});

const modalServicio = document.getElementById('modal-servicio');
if (modalServicio) {
    modalServicio.addEventListener('click', e => {
        if (e.target.id === 'modal-servicio') cerrar('modal-servicio');
    });
} else {
    console.error('Modal modal-servicio no encontrado');
}

const abrirModalDescuentoNuevo = document.getElementById('abrir-modal-descuento-nuevo');
if (abrirModalDescuentoNuevo) {
    abrirModalDescuentoNuevo.addEventListener('click', () => {
        console.log('Botón abrir-modal-descuento-nuevo clicado');
        document.getElementById('descuento-context').value = 'nuevo';
        document.getElementById('descuento-tipo-select').value = document.getElementById('nuevo-descuento-tipo').value || 'porcentaje';
        document.getElementById('descuento-porcentaje').value = document.getElementById('nuevo-descuento-tipo').value === 'porcentaje' ? document.getElementById('nuevo-descuento-valor').value : '';
        document.getElementById('descuento-cantidad').value = document.getElementById('nuevo-descuento-tipo').value === 'cantidad' ? document.getElementById('nuevo-descuento-valor').value : '';
        document.getElementById('descuento-fecha-inicio').value = document.getElementById('nuevo-descuento-fecha-inicio').value;
        document.getElementById('descuento-fecha-fin').value = document.getElementById('nuevo-descuento-fecha-fin').value;
        document.getElementById('eliminar-descuento').hidden = !document.getElementById('nuevo-descuento-valor').value;
        setupDescuentoLogic('nuevo-precio', 'nuevo');
        abrir('modal-descuento');
    });
} else {
    console.error('Botón abrir-modal-descuento-nuevo no encontrado');
}

const formServicioNuevo = document.getElementById('form-servicio-nuevo');
if (formServicioNuevo) {
    formServicioNuevo.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Formulario de nuevo servicio enviado');
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
                console.error('Error en la respuesta de añadir servicio:', result);
                alert('Error al añadir el servicio: ' + result.error);
            }
        } catch (error) {
            console.error('Error al conectar con el servidor al añadir servicio:', error);
            alert('Error al conectar con el servidor: ' + error.message);
        }
    });
} else {
    console.error('Formulario form-servicio-nuevo no encontrado');
}

// Editar servicio
const modalEditar = document.getElementById('modal-editar-servicio');
if (modalEditar) {
    document.querySelectorAll('.cerrar-modal-editar').forEach(b => {
        b.addEventListener('click', () => cerrar('modal-editar-servicio'));
    });
    modalEditar.addEventListener('click', e => {
        if (e.target.id === 'modal-editar-servicio') cerrar('modal-editar-servicio');
    });
} else {
    console.error('Modal modal-editar-servicio no encontrado');
}

const abrirModalDescuentoEditar = document.getElementById('abrir-modal-descuento-editar');
if (abrirModalDescuentoEditar) {
    abrirModalDescuentoEditar.addEventListener('click', () => {
        console.log('Botón abrir-modal-descuento-editar clicado');
        document.getElementById('descuento-context').value = 'edit';
        document.getElementById('descuento-tipo-select').value = document.getElementById('edit-descuento-tipo').value || 'porcentaje';
        document.getElementById('descuento-porcentaje').value = document.getElementById('edit-descuento-tipo').value === 'porcentaje' ? document.getElementById('edit-descuento-valor').value : '';
        document.getElementById('descuento-cantidad').value = document.getElementById('edit-descuento-tipo').value === 'cantidad' ? document.getElementById('edit-descuento-valor').value : '';
        document.getElementById('descuento-fecha-inicio').value = document.getElementById('edit-descuento-fecha-inicio').value;
        document.getElementById('descuento-fecha-fin').value = document.getElementById('edit-descuento-fecha-fin').value;
        document.getElementById('eliminar-descuento').hidden = !document.getElementById('edit-descuento-valor').value;
        setupDescuentoLogic('edit-precio', 'edit');
        abrir('modal-descuento');
    });
} else {
    console.error('Botón abrir-modal-descuento-editar no encontrado');
}

const formServicioEditar = document.getElementById('form-servicio-editar');
if (formServicioEditar) {
    formServicioEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Formulario de editar servicio enviado');
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
                console.error('Error en la respuesta de editar servicio:', result);
                alert('Error al actualizar el servicio: ' + result.error);
            }
        } catch (error) {
            console.error('Error al conectar con el servidor al editar servicio:', error);
            alert('Error al conectar con el servidor: ' + error.message);
        }
    });
} else {
    console.error('Formulario form-servicio-editar no encontrado');
}

// Eliminar servicio
const modalEliminar = document.getElementById('modal-eliminar-servicio');
if (modalEliminar) {
    document.querySelectorAll('.cerrar-modal-eliminar').forEach(b => {
        b.addEventListener('click', () => cerrar('modal-eliminar-servicio'));
    });
    modalEliminar.addEventListener('click', e => {
        if (e.target.id === 'modal-eliminar-servicio') cerrar('modal-eliminar-servicio');
    });
} else {
    console.error('Modal modal-eliminar-servicio no encontrado');
}

const formServicioEliminar = document.getElementById('form-servicio-eliminar');
if (formServicioEliminar) {
    formServicioEliminar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('eliminar-id').value;
        console.log('Formulario de eliminar servicio enviado, ID:', id);
        try {
            const response = await fetch(`/api/servicios/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            if (response.ok) {
                alert('¡Servicio eliminado correctamente!');
                cerrar('modal-eliminar-servicio');
                cargarServicios();
            } else {
                console.error('Error en la respuesta de eliminar servicio:', result);
                alert('Error al eliminar el servicio: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al conectar con el servidor al eliminar servicio:', error);
            alert('Error al conectar con el servidor: ' + error.message);
        }
    });
} else {
    console.error('Formulario form-servicio-eliminar no encontrado');
}

// Modal de descuento
const cerrarModalDescuento = document.getElementById('cerrar-modal-descuento');
if (cerrarModalDescuento) {
    cerrarModalDescuento.addEventListener('click', () => cerrar('modal-descuento'));
} else {
    console.error('Botón cerrar-modal-descuento no encontrado');
}

const cerrarModalDescuentoBtn = document.getElementById('cerrar-modal-descuento-btn');
if (cerrarModalDescuentoBtn) {
    cerrarModalDescuentoBtn.addEventListener('click', () => cerrar('modal-descuento'));
} else {
    console.error('Botón cerrar-modal-descuento-btn no encontrado');
}

const modalDescuento = document.getElementById('modal-descuento');
if (modalDescuento) {
    modalDescuento.addEventListener('click', e => {
        if (e.target.id === 'modal-descuento') cerrar('modal-descuento');
    });
} else {
    console.error('Modal modal-descuento no encontrado');
}

// Cargar servicios al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página cargada, inicializando servicios');
    cargarServicios();
});
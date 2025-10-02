function abrir(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function cerrar(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
  }
}

(function () {
  const state = { servicios: [] };
  const dom = {};
  const discount = { context: null, precioInput: null };

  const priceFormatter = typeof Intl !== 'undefined'
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })
    : null;

  function formatCurrency(value) {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      return '$0';
    }
    return priceFormatter ? priceFormatter.format(Number(value)) : '$' + Number(value).toFixed(0);
  }

  function cacheDom() {
    dom.tbody = document.getElementById('servicios-tbody');
    if (!dom.tbody) {
      return;
    }

    dom.addModal = document.getElementById('modal-servicio');
    dom.addBtn = document.getElementById('btn-abrir-modal-servicio');
    dom.addCloseButtons = Array.from(document.querySelectorAll('.btn-cerrar-add'));
    dom.newForm = document.getElementById('form-servicio-nuevo');

    dom.editModal = document.getElementById('modal-editar-servicio');
    dom.editForm = document.getElementById('form-servicio-editar');
    dom.editCloseButtons = Array.from(document.querySelectorAll('.cerrar-modal-editar'));
    dom.previewWrapper = document.getElementById('preview-imagen-actual');
    dom.previewImage = document.getElementById('img-actual');

    dom.deleteModal = document.getElementById('modal-eliminar-servicio');
    dom.deleteForm = document.getElementById('form-servicio-eliminar');
    dom.deleteCloseButtons = Array.from(document.querySelectorAll('.cerrar-modal-eliminar'));

    dom.discountModal = document.getElementById('modal-descuento');
    dom.discountForm = document.getElementById('form-descuento');
    dom.discountCloseButtons = [
      document.getElementById('cerrar-modal-descuento'),
      document.getElementById('cerrar-modal-descuento-btn'),
    ].filter(Boolean);
    dom.addDiscountBtn = document.getElementById('abrir-modal-descuento-nuevo');
    dom.editDiscountBtn = document.getElementById('abrir-modal-descuento-editar');
    dom.removeDiscountBtn = document.getElementById('eliminar-descuento');

    discount.tipoSelect = document.getElementById('descuento-tipo-select');
    discount.porcentajeInput = document.getElementById('descuento-porcentaje');
    discount.cantidadInput = document.getElementById('descuento-cantidad');
    discount.precioFinalInput = document.getElementById('descuento-precio-final');
    discount.fechaInicioInput = document.getElementById('descuento-fecha-inicio');
    discount.fechaFinInput = document.getElementById('descuento-fecha-fin');
  }

  function renderMessage(text, className) {
    dom.tbody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'px-6 py-4 text-center ' + className;
    td.textContent = text;
    tr.appendChild(td);
    dom.tbody.appendChild(tr);
  }

  function bindAddModalEvents() {
    if (!dom.addBtn || !dom.addModal || !dom.newForm) {
      return;
    }

    dom.addBtn.addEventListener('click', () => {
      dom.newForm.reset();
      const fields = [
        'nuevo-descuento-tipo',
        'nuevo-descuento-valor',
        'nuevo-descuento-fecha-inicio',
        'nuevo-descuento-fecha-fin',
      ];
      fields.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          element.value = '';
        }
      });
      abrir('modal-servicio');
    });

    dom.addCloseButtons.forEach((button) => {
      button.addEventListener('click', () => cerrar('modal-servicio'));
    });

    dom.addModal.addEventListener('click', (event) => {
      if (event.target === dom.addModal) {
        cerrar('modal-servicio');
      }
    });

    dom.newForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(dom.newForm);
      try {
        const response = await fetch('/api/servicios', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) {
          alert(result.error || 'Error al crear servicio');
          return;
        }
        alert('¡Servicio añadido correctamente!');
        cerrar('modal-servicio');
        await cargarServicios();
      } catch (error) {
        console.error('Error al crear servicio:', error);
        alert('Error al conectar con el servidor.');
      }
    });
  }

  function bindEditModalEvents() {
    if (!dom.editModal || !dom.editForm) {
      return;
    }

    dom.editCloseButtons.forEach((button) => {
      button.addEventListener('click', () => cerrar('modal-editar-servicio'));
    });

    dom.editModal.addEventListener('click', (event) => {
      if (event.target === dom.editModal) {
        cerrar('modal-editar-servicio');
      }
    });

    dom.editForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(dom.editForm);
      const id = formData.get('id');
      try {
        const response = await fetch('/api/servicios/' + id, {
          method: 'PUT',
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) {
          alert(result.error || 'Error al actualizar servicio');
          return;
        }
        alert('¡Servicio actualizado correctamente!');
        cerrar('modal-editar-servicio');
        await cargarServicios();
      } catch (error) {
        console.error('Error al actualizar servicio:', error);
        alert('Error al conectar con el servidor.');
      }
    });
  }

  function bindDeleteModalEvents() {
    if (!dom.deleteModal || !dom.deleteForm) {
      return;
    }

    dom.deleteCloseButtons.forEach((button) => {
      button.addEventListener('click', () => cerrar('modal-eliminar-servicio'));
    });

    dom.deleteModal.addEventListener('click', (event) => {
      if (event.target === dom.deleteModal) {
        cerrar('modal-eliminar-servicio');
      }
    });

    dom.deleteForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const idInput = document.getElementById('eliminar-id');
      const id = idInput ? idInput.value : null;
      if (!id) {
        return;
      }
      try {
        const response = await fetch('/api/servicios/' + id, {
          method: 'DELETE',
        });
        const result = await response.json();
        if (!response.ok) {
          alert(result.error || 'Error al eliminar servicio');
          return;
        }
        alert('¡Servicio eliminado correctamente!');
        cerrar('modal-eliminar-servicio');
        await cargarServicios();
      } catch (error) {
        console.error('Error al eliminar servicio:', error);
        alert('Error al conectar con el servidor.');
      }
    });
  }

  function bindDiscountModalEvents() {
    if (!dom.discountModal || !dom.discountForm || !discount.tipoSelect) {
      return;
    }

    function setHiddenValue(prefix, suffix, value) {
      const element = document.getElementById(prefix + '-descuento-' + suffix);
      if (element) {
        element.value = value || '';
      }
    }

    function attachPrecioListener(inputId) {
      const input = document.getElementById(inputId);
      if (!input) {
        return;
      }
      if (discount.precioInput) {
        discount.precioInput.removeEventListener('input', updatePrecioFinal);
      }
      discount.precioInput = input;
      discount.precioInput.addEventListener('input', updatePrecioFinal);
    }

    function openDiscountModal(context) {
      discount.context = context;
      const prefix = context === 'nuevo' ? 'nuevo' : 'edit';

      const tipo = document.getElementById(prefix + '-descuento-tipo');
      const valor = document.getElementById(prefix + '-descuento-valor');
      const fechaInicio = document.getElementById(prefix + '-descuento-fecha-inicio');
      const fechaFin = document.getElementById(prefix + '-descuento-fecha-fin');

      discount.tipoSelect.value = tipo && tipo.value ? tipo.value : 'porcentaje';
      discount.porcentajeInput.value = discount.tipoSelect.value === 'porcentaje' && valor ? valor.value : '';
      discount.cantidadInput.value = discount.tipoSelect.value === 'cantidad' && valor ? valor.value : '';
      discount.fechaInicioInput.value = fechaInicio && fechaInicio.value ? fechaInicio.value : '';
      discount.fechaFinInput.value = fechaFin && fechaFin.value ? fechaFin.value : '';
      discount.precioFinalInput.value = '';

      attachPrecioListener(prefix === 'nuevo' ? 'nuevo-precio' : 'edit-precio');
      updatePrecioFinal();

      if (dom.removeDiscountBtn) {
        const hasExistingValues = Boolean((valor && valor.value) || (fechaInicio && fechaInicio.value) || (fechaFin && fechaFin.value));
        dom.removeDiscountBtn.hidden = !hasExistingValues;
      }

      abrir('modal-descuento');
    }

    function updatePrecioFinal() {
      if (!discount.precioInput) {
        return;
      }
      const precio = parseFloat(discount.precioInput.value) || 0;
      const tipo = discount.tipoSelect.value;
      let porcentaje = parseFloat(discount.porcentajeInput.value);
      let cantidad = parseFloat(discount.cantidadInput.value);

      if (tipo === 'porcentaje') {
        if (Number.isFinite(porcentaje)) {
          cantidad = precio * (porcentaje / 100);
          discount.cantidadInput.value = cantidad > 0 ? cantidad.toFixed(2) : '';
        } else {
          cantidad = 0;
        }
      } else if (tipo === 'cantidad') {
        if (Number.isFinite(cantidad) && precio > 0) {
          porcentaje = (cantidad / precio) * 100;
          discount.porcentajeInput.value = porcentaje > 0 ? porcentaje.toFixed(2) : '';
        } else {
          porcentaje = 0;
        }
      }

      let precioFinal = precio;
      if (tipo === 'porcentaje' && Number.isFinite(porcentaje)) {
        precioFinal = precio * (1 - porcentaje / 100);
      } else if (tipo === 'cantidad' && Number.isFinite(cantidad)) {
        precioFinal = precio - cantidad;
      }
      discount.precioFinalInput.value = precioFinal >= 0 ? precioFinal.toFixed(2) : '';
    }

    discount.tipoSelect.addEventListener('change', () => {
      if (discount.tipoSelect.value === 'porcentaje') {
        discount.cantidadInput.value = '';
      } else {
        discount.porcentajeInput.value = '';
      }
      updatePrecioFinal();
    });

    discount.porcentajeInput.addEventListener('input', () => {
      if (discount.tipoSelect.value === 'porcentaje') {
        updatePrecioFinal();
      }
    });

    discount.cantidadInput.addEventListener('input', () => {
      if (discount.tipoSelect.value === 'cantidad') {
        updatePrecioFinal();
      }
    });

    dom.discountCloseButtons.forEach((button) => {
      button.addEventListener('click', () => cerrar('modal-descuento'));
    });

    dom.discountModal.addEventListener('click', (event) => {
      if (event.target === dom.discountModal) {
        cerrar('modal-descuento');
      }
    });

    dom.discountForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!discount.context) {
        return;
      }
      const prefix = discount.context === 'nuevo' ? 'nuevo' : 'edit';
      const tipoSeleccionado = discount.tipoSelect.value;
      const valorSeleccionado = tipoSeleccionado === 'porcentaje'
        ? (discount.porcentajeInput.value ? parseFloat(discount.porcentajeInput.value).toFixed(2) : '')
        : (discount.cantidadInput.value ? parseFloat(discount.cantidadInput.value).toFixed(2) : '');

      setHiddenValue(prefix, 'tipo', tipoSeleccionado);
      setHiddenValue(prefix, 'valor', valorSeleccionado);
      setHiddenValue(prefix, 'fecha-inicio', discount.fechaInicioInput.value);
      setHiddenValue(prefix, 'fecha-fin', discount.fechaFinInput.value);

      cerrar('modal-descuento');
    });

    if (dom.removeDiscountBtn) {
      dom.removeDiscountBtn.addEventListener('click', () => {
        if (!discount.context) {
          return;
        }
        const prefix = discount.context === 'nuevo' ? 'nuevo' : 'edit';
        setHiddenValue(prefix, 'tipo', '');
        setHiddenValue(prefix, 'valor', '');
        setHiddenValue(prefix, 'fecha-inicio', '');
        setHiddenValue(prefix, 'fecha-fin', '');
        discount.porcentajeInput.value = '';
        discount.cantidadInput.value = '';
        discount.fechaInicioInput.value = '';
        discount.fechaFinInput.value = '';
        discount.precioFinalInput.value = '';
        cerrar('modal-descuento');
      });
    }

    if (dom.addDiscountBtn) {
      dom.addDiscountBtn.addEventListener('click', () => openDiscountModal('nuevo'));
    }

    if (dom.editDiscountBtn) {
      dom.editDiscountBtn.addEventListener('click', () => openDiscountModal('edit'));
    }
  }

  async function cargarServicios() {
    renderMessage('Cargando servicios...', 'text-gray-400');
    try {
      const response = await fetch('/api/servicios');
      const data = await response.json();
      if (!response.ok) {
        renderMessage('Error al cargar servicios: ' + (data.error || 'Error desconocido'), 'text-red-300');
        return;
      }
      state.servicios = Array.isArray(data) ? data : [];
      renderServicios();
    } catch (error) {
      console.error('Error al cargar servicios:', error);
      renderMessage('Error al conectar con el servidor.', 'text-red-300');
    }
  }

  function renderServicios() {
    if (!state.servicios.length) {
      renderMessage('No hay servicios registrados.', 'text-gray-400');
      return;
    }

    dom.tbody.innerHTML = '';

    state.servicios.forEach((servicio) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-700 transition';
      tr.dataset.id = servicio.id;

      const idCell = document.createElement('td');
      idCell.className = 'px-4 py-3 text-sm text-gray-300';
      idCell.textContent = servicio.id;

      const nombreCell = document.createElement('td');
      nombreCell.className = 'px-4 py-3 text-sm text-gray-100 font-semibold';
      nombreCell.textContent = servicio.nombre || '';

      const imagenCell = document.createElement('td');
      imagenCell.className = 'px-4 py-3 text-sm text-gray-200';
      if (servicio.imagen_url) {
        const img = document.createElement('img');
        img.src = servicio.imagen_url;
        img.alt = servicio.nombre || 'Servicio';
        img.className = 'h-16 w-16 object-cover rounded border border-gray-600';
        imagenCell.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.className = 'text-gray-500';
        span.textContent = 'Sin imagen';
        imagenCell.appendChild(span);
      }

      const descripcionCell = document.createElement('td');
      descripcionCell.className = 'px-4 py-3 text-sm text-gray-200 max-w-xs';
      descripcionCell.textContent = servicio.descripcion || '—';

      const precioCell = document.createElement('td');
      precioCell.className = 'px-4 py-3 text-sm text-gray-200';
      precioCell.textContent = formatCurrency(servicio.precio);

      const duracionCell = document.createElement('td');
      duracionCell.className = 'px-4 py-3 text-sm text-gray-200';
      duracionCell.textContent = servicio.duracion_minutos || 0;

      const descuentoCell = document.createElement('td');
      descuentoCell.className = 'px-4 py-3 text-sm text-gray-200';
      if (servicio.descuento) {
        const descuentoWrapper = document.createElement('div');
        descuentoWrapper.className = 'flex items-center gap-2 text-gray-100';

        const finalPrice = typeof servicio.descuento.precio_final === 'number'
          ? servicio.descuento.precio_final
          : Math.max(0, Number(servicio.precio) - Number(servicio.descuento.valor || 0));

        let descuentoImporte;
        if (servicio.descuento.tipo === 'porcentaje' && typeof servicio.descuento.precio_final === 'number') {
          descuentoImporte = Number(servicio.precio) - Number(servicio.descuento.precio_final);
        } else {
          descuentoImporte = Number(servicio.descuento.valor || 0);
        }
        descuentoImporte = Math.max(0, descuentoImporte);

        const descuentoSpan = document.createElement('span');
        descuentoSpan.className = 'font-semibold';
        descuentoSpan.textContent = formatCurrency(descuentoImporte);

        const separatorSpan = document.createElement('span');
        separatorSpan.className = 'text-gray-400';
        separatorSpan.textContent = '→';

        const finalSpan = document.createElement('span');
        finalSpan.className = 'font-semibold';
        finalSpan.textContent = formatCurrency(finalPrice);

        descuentoWrapper.appendChild(descuentoSpan);
        descuentoWrapper.appendChild(separatorSpan);
        descuentoWrapper.appendChild(finalSpan);

        descuentoCell.appendChild(descuentoWrapper);
      } else {
        const spanSin = document.createElement('span');
        spanSin.className = 'text-gray-500';
        spanSin.textContent = 'Sin descuento';
        descuentoCell.appendChild(spanSin);
      }

      const accionesCell = document.createElement('td');
      accionesCell.className = 'px-4 py-3 text-center text-sm text-gray-200';
      const accionesWrapper = document.createElement('div');
      accionesWrapper.className = 'flex justify-center gap-2';

      const editarBtn = document.createElement('button');
      editarBtn.type = 'button';
      editarBtn.className = 'btn-editar-servicio text-blue-400 hover:text-blue-300 transition';
      editarBtn.title = 'Editar';
      editarBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 3.487l2.651 2.651a2.25 2.25 0 010 3.182L9.41 19.425l-4.682 1.02 1.02-4.682 10.103-10.105a2.25 2.25 0 013.182 0z"/>\n</svg>';
      editarBtn.addEventListener('click', () => openEditModal(servicio.id));

      const eliminarBtn = document.createElement('button');
      eliminarBtn.type = 'button';
      eliminarBtn.className = 'btn-eliminar-servicio text-red-400 hover:text-red-300 transition';
      eliminarBtn.title = 'Eliminar';
      eliminarBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"/>\n</svg>';
      eliminarBtn.addEventListener('click', () => openDeleteModal(servicio.id));

      accionesWrapper.appendChild(editarBtn);
      accionesWrapper.appendChild(eliminarBtn);
      accionesCell.appendChild(accionesWrapper);

      tr.appendChild(idCell);
      tr.appendChild(nombreCell);
      tr.appendChild(imagenCell);
      tr.appendChild(descripcionCell);
      tr.appendChild(precioCell);
      tr.appendChild(duracionCell);
      tr.appendChild(descuentoCell);
      tr.appendChild(accionesCell);

      dom.tbody.appendChild(tr);
    });
  }

  function openEditModal(id) {
    const servicio = state.servicios.find((item) => Number(item.id) === Number(id));
    if (!servicio) {
      alert('Servicio no encontrado.');
      return;
    }

    const idInput = document.getElementById('edit-id');
    const nombreInput = document.getElementById('edit-nombre');
    const descripcionInput = document.getElementById('edit-descripcion');
    const precioInput = document.getElementById('edit-precio');
    const duracionInput = document.getElementById('edit-duracion');

    if (idInput) idInput.value = servicio.id;
    if (nombreInput) nombreInput.value = servicio.nombre || '';
    if (descripcionInput) descripcionInput.value = servicio.descripcion || '';
    if (precioInput) precioInput.value = servicio.precio || '';
    if (duracionInput) duracionInput.value = servicio.duracion_minutos || '';

    if (dom.previewWrapper && dom.previewImage) {
      if (servicio.imagen_url) {
        dom.previewImage.src = servicio.imagen_url;
        dom.previewWrapper.hidden = false;
      } else {
        dom.previewImage.src = '';
        dom.previewWrapper.hidden = true;
      }
    }

    if (servicio.descuento) {
      setEditDiscount(servicio.descuento);
    } else {
      setEditDiscount();
    }

    abrir('modal-editar-servicio');
  }

  function setEditDiscount(descuento) {
    const tipo = document.getElementById('edit-descuento-tipo');
    const valor = document.getElementById('edit-descuento-valor');
    const fechaInicio = document.getElementById('edit-descuento-fecha-inicio');
    const fechaFin = document.getElementById('edit-descuento-fecha-fin');

    if (!descuento) {
      if (tipo) tipo.value = '';
      if (valor) valor.value = '';
      if (fechaInicio) fechaInicio.value = '';
      if (fechaFin) fechaFin.value = '';
      return;
    }

    if (tipo) tipo.value = descuento.tipo || '';
    if (valor) valor.value = descuento.valor || '';
    if (fechaInicio) fechaInicio.value = descuento.fecha_inicio || '';
    if (fechaFin) fechaFin.value = descuento.fecha_fin || '';
  }

  function openDeleteModal(id) {
    const servicio = state.servicios.find((item) => Number(item.id) === Number(id));
    if (!servicio) {
      alert('Servicio no encontrado.');
      return;
    }

    const idInput = document.getElementById('eliminar-id');
    const nombreSpan = document.getElementById('eliminar-nombre');
    if (idInput) idInput.value = servicio.id;
    if (nombreSpan) nombreSpan.textContent = servicio.nombre || '';

    abrir('modal-eliminar-servicio');
  }

  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    if (!dom.tbody) {
      return;
    }
    bindAddModalEvents();
    bindEditModalEvents();
    bindDeleteModalEvents();
    bindDiscountModalEvents();
    cargarServicios();
  });
})();

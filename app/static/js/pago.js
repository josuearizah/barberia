document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('pagos-tbody');
  const totalEl = document.getElementById('pagos-total');
  const search = document.getElementById('pagos-search');
  const filterToggle = document.getElementById('pagos-filter-toggle');
  const filterPopover = document.getElementById('pagos-filter-popover');
  const filterClose = document.getElementById('pagos-close-filter');
  const dateFilter = document.getElementById('pagos-date');
  const metodoFilter = document.getElementById('pagos-metodo');

  let pagos = [];
  let orderByDateDesc = true;
  let isAdmin = false;

  const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
  let editContext = { id: null, total: 0 };

  function render() {
    if (!tbody) return;
    const term = (search?.value || '').toLowerCase();
    const dateVal = dateFilter?.value || '';
    const metodoVal = metodoFilter?.value || '';

    tbody.innerHTML = '';
    let count = 0;
    // Ordenar por fecha_registro
    const pagosFiltrados = pagos.slice().sort((a, b) => {
      const da = new Date(a.fecha_registro);
      const db = new Date(b.fecha_registro);
      return orderByDateDesc ? (db - da) : (da - db);
    });

    pagosFiltrados.forEach(p => {
      const fecha = p.fecha_registro.split(' ')[0];
      const nombre = (isAdmin
        ? `${p.cliente_nombre || ''} ${p.cliente_apellido || ''}`
        : `${p.barbero_nombre || ''} ${p.barbero_apellido || ''}`
      ).trim();
      const fullText = `${p.id} ${p.cita_id} ${nombre} ${p.metodo}`.toLowerCase();
      let show = true;
      if (term && !fullText.includes(term)) show = false;
      if (dateVal && fecha !== dateVal) show = false;
      if (metodoVal && p.metodo !== metodoVal) show = false;
      if (!show) return;
      count++;
      const tr = document.createElement('tr');
      const fechaSolo = (p.fecha_registro || '').split(' ')[0] || '';
      let row = `
        <td class="px-6 py-3 text-sm text-gray-200">${p.id}</td>
        <td class="px-6 py-3 text-sm text-gray-200 whitespace-nowrap">${fechaSolo}</td>
        <td class="px-6 py-3 text-sm text-gray-200">${p.cita_id}</td>
        <td class="px-6 py-3 text-sm text-gray-200 whitespace-normal min-w-[12rem]">${(p.cliente_nombre || '') + ' ' + (p.cliente_apellido || '')}</td>
        <td class="px-6 py-3 text-sm text-gray-200">${p.metodo}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-200">${fmt(p.subtotal)}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-200">-${fmt(p.descuento)}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-200">${fmt(p.total)}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-200">${p.monto_recibido != null ? fmt(p.monto_recibido) : '-'}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-200">${p.saldo != null ? fmt(p.saldo) : '-'}</td>`;
      if (window.isAdmin === true || typeof isAdmin !== 'undefined' && isAdmin) {
        row += `
        <td class="px-6 py-3 text-sm text-right text-gray-200">
          <span class="inline-flex items-center justify-end gap-2">
            <span class="pago-editar cursor-pointer text-blue-600 hover:text-blue-400" title="Editar" data-id="${p.id}" data-total="${p.total}" data-recibido="${p.monto_recibido ?? ''}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 3.487l2.651 2.651a2.25 2.25 0 010 3.182L9.41 19.425l-4.682 1.02 1.02-4.682 10.103-10.105a2.25 2.25 0 013.182 0z"/>
              </svg>
            </span>
            <span class="pago-eliminar cursor-pointer text-red-600 hover:text-red-500" title="Eliminar" data-id="${p.id}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"/>
              </svg>
            </span>
          </span>
        </td>`;
      }
      tr.innerHTML = row;
      // Ajustes por rol: en cliente mostrar nombre del barbero y sin acciones
      if (!isAdmin) {
        const tds = tr.querySelectorAll('td');
        if (tds[3]) tds[3].textContent = nombre;
        if (tds.length > 10) {
          tds[tds.length - 1].remove();
        }
      }
      tbody.appendChild(tr);
    });
    if (totalEl) totalEl.textContent = String(count);
  }

  async function cargarPagos() {
    try {
      // Detectar rol para escoger endpoint adecuado
      try {
        const u = await fetch('/api/usuario_actual');
        if (u.ok) {
          const info = await u.json();
          isAdmin = (info.rol === 'admin');
        }
      } catch {}
      const endpoint = isAdmin ? '/api/pagos' : '/api/pagos/cliente';
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar pagos');
      pagos = Array.isArray(data) ? data : [];
      render();
    } catch (e) {
      console.error(e);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-4 text-center text-gray-400">${e.message}</td></tr>`;
      }
    }
  }

  search?.addEventListener('input', render);
  dateFilter?.addEventListener('change', render);
  metodoFilter?.addEventListener('change', render);

  // Toggle orden
  const orderBtn = document.getElementById('pagos-order-toggle');
  const orderIcon = document.getElementById('pagos-order-icon');
  const orderText = document.getElementById('pagos-order-text');
  orderBtn?.addEventListener('click', () => {
    orderByDateDesc = !orderByDateDesc;
    if (orderText) orderText.textContent = orderByDateDesc ? 'Más reciente primero' : 'Más antiguo primero';
    if (orderIcon) orderIcon.innerHTML = orderByDateDesc
      ? '<path d="M12 5v14m0 0l-4-4m4 4l4-4"/>'
      : '<path d="M12 19V5m0 0l4 4m-4-4l-4 4"/>';
    render();
  });

  cargarPagos();

  // Popover de filtros: posicionamiento y cierre
  filterToggle?.addEventListener('click', () => {
    if (!filterPopover || !filterToggle) return;
    filterPopover.classList.remove('hidden');
    setTimeout(() => {
      const rect = filterToggle.getBoundingClientRect();
      const popW = filterPopover.offsetWidth;
      let left = rect.right - popW;
      if (left < 10) left = 10;
      if (left + popW > window.innerWidth - 10) left = window.innerWidth - popW - 10;
      filterPopover.style.top = `${rect.bottom + window.scrollY + 5}px`;
      filterPopover.style.left = `${left + window.scrollX}px`;
      if (window.innerWidth < 640) {
        filterPopover.style.left = '50%';
        filterPopover.style.transform = 'translateX(-50%)';
      } else {
        filterPopover.style.transform = 'none';
      }
    }, 0);
  });

  filterClose?.addEventListener('click', () => filterPopover?.classList.add('hidden'));
  filterPopover?.addEventListener('click', (e) => {
    if (e.target.id === 'pagos-filter-popover') filterPopover.classList.add('hidden');
  });

  // ----- Editar -----
  const modalEdit = document.getElementById('modal-editar-pago');
  const editClose = document.getElementById('edit-close');
  const editCancel = document.getElementById('edit-cancel');
  const formEdit = document.getElementById('form-pago-editar');
  const editId = document.getElementById('edit-pago-id');
  const editMonto = document.getElementById('edit-monto-recibido');
  const editSaldo = document.getElementById('edit-saldo');

  let delContextId = null;

  document.addEventListener('click', (e) => {
    const editEl = e.target.closest('.pago-editar');
    const delEl = e.target.closest('.pago-eliminar');
    if (editEl) {
      editContext.id = Number(editEl.dataset.id);
      editContext.total = Number(editEl.dataset.total || 0);
      editId.value = editContext.id;
      editMonto.value = editEl.dataset.recibido || '';
      const recibido = Number(editMonto.value || 0);
      const saldo = Math.max(0, editContext.total - recibido);
      editSaldo.textContent = `Saldo: ${fmt(saldo)}`;
      modalEdit.classList.remove('hidden');
    }
    if (delEl) {
      delContextId = Number(delEl.dataset.id);
      modalDel.classList.remove('hidden');
    }
  });

  editMonto?.addEventListener('input', () => {
    const recibido = Number(editMonto.value || 0);
    const saldo = Math.max(0, editContext.total - recibido);
    editSaldo.textContent = `Saldo: ${fmt(saldo)}`;
  });

  const closeEdit = () => modalEdit?.classList.add('hidden');
  editClose?.addEventListener('click', closeEdit);
  editCancel?.addEventListener('click', closeEdit);
  modalEdit?.addEventListener('click', (e) => { if (e.target === modalEdit) closeEdit(); });

  formEdit?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const recibido = editMonto.value === '' ? null : Number(editMonto.value);
      const res = await fetch(`/api/pagos/${editContext.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto_recibido: recibido })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar pago');
      closeEdit();
      await cargarPagos();
    } catch (err) {
      alert(err.message);
    }
  });

  // ----- Eliminar -----
  const modalDel = document.getElementById('modal-eliminar-pago');
  const delCancel = document.getElementById('del-cancel');
  const delConfirm = document.getElementById('del-confirm');
  const closeDel = () => modalDel?.classList.add('hidden');
  delCancel?.addEventListener('click', closeDel);
  modalDel?.addEventListener('click', (e) => { if (e.target === modalDel) closeDel(); });
  delConfirm?.addEventListener('click', async () => {
    if (!delContextId) return;
    try {
      const res = await fetch(`/api/pagos/${delContextId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar pago');
      closeDel();
      await cargarPagos();
    } catch (err) {
      alert(err.message);
    }
  });
});

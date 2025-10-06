document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("pagos-tbody");
  const totalEl = document.getElementById("pagos-total");
  const search = document.getElementById("pagos-search");
  const filterToggle = document.getElementById("pagos-filter-toggle");
  const filterPopover = document.getElementById("pagos-filter-popover");
  const filterClose = document.getElementById("pagos-close-filter");
  const dateFilter = document.getElementById("pagos-date");
  const metodoFilter = document.getElementById("pagos-metodo");

  let pagos = [];
  let orderByDateDesc = true;
  let isAdmin = false;

  const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
  // Eliminado contexto de edición/eliminación
  let editContext = { id: null, total: 0 }; // mantenido sólo si otras partes lo referencian

  function render() {
    if (!tbody) return;
    const term = (search?.value || "").toLowerCase();
    const dateVal = dateFilter?.value || "";
    const metodoVal = metodoFilter?.value || "";

    tbody.innerHTML = "";
    let count = 0;
    // Ordenar por fecha_registro
    const pagosFiltrados = pagos.slice().sort((a, b) => {
      const da = new Date(a.fecha_registro);
      const db = new Date(b.fecha_registro);
      return orderByDateDesc ? db - da : da - db;
    });

    pagosFiltrados.forEach((p) => {
      const fecha = p.fecha_registro.split(" ")[0];
      const nombre = (
        isAdmin
          ? `${p.cliente_nombre || ""} ${p.cliente_apellido || ""}`
          : `${p.barbero_nombre || ""} ${p.barbero_apellido || ""}`
      ).trim();
      const fullText =
        `${p.id} ${p.cita_id} ${nombre} ${p.metodo}`.toLowerCase();
      let show = true;
      if (term && !fullText.includes(term)) show = false;
      if (dateVal && fecha !== dateVal) show = false;
      if (metodoVal && p.metodo !== metodoVal) show = false;
      if (!show) return;
      count++;
      const tr = document.createElement("tr");
      const fechaSolo = (p.fecha_registro || "").split(" ")[0] || "";
      const transferValue = isAdmin
        ? typeof p.transferido === "number"
          ? p.transferido
          : typeof p.transferido === "string"
          ? Number(p.transferido)
          : null
        : p.monto_recibido != null
        ? Number(p.monto_recibido)
        : null;
      const saldoValue = isAdmin
        ? typeof p.saldo_barbero === "number"
          ? p.saldo_barbero
          : typeof p.saldo_barbero === "string"
          ? Number(p.saldo_barbero)
          : null
        : p.saldo != null
        ? Number(p.saldo)
        : null;
      let row = `
        <td class="px-6 py-3 text-sm text-gray-200">${p.id}</td>
        <td class="px-6 py-3 text-sm text-gray-200 whitespace-nowrap">${fechaSolo}</td>
        <td class="px-6 py-3 text-sm text-gray-200">${p.cita_id}</td>
        <td class="px-6 py-3 text-sm text-gray-200 whitespace-normal min-w-[12rem]">${nombre}</td>
        <td class="px-6 py-3 text-sm text-gray-200">${p.metodo}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-200">${fmt(
          p.subtotal
        )}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-200">-${fmt(
          p.descuento
        )}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-200">${fmt(
          p.total
        )}</td>
        <td class="px-6 py-3 text-sm text-right text-gray-200">${
          transferValue != null ? fmt(transferValue) : "-"
        }</td>
        <td class="px-6 py-3 text-sm text-right text-gray-200">${
          saldoValue != null ? fmt(saldoValue) : "-"
        }</td>`;
      row += `
      <td class="px-6 py-3 text-sm text-right text-gray-200">
        <span class="relative inline-flex justify-end w-full">
          <button class="pago-menu inline-flex items-center justify-center size-8 bg-gray-700 hover:bg-gray-600 rounded" data-id="${p.id}" title="Opciones">⋯</button>
          <div class="menu-pop absolute right-0 mt-1 hidden bg-gray-800 border border-gray-600 rounded shadow-lg z-10">
            <button class="pago-factura flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 w-full text-left" data-id="${p.id}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3h8v4M19 21H5a2 2 0 01-2-2V7h18v12a2 2 0 01-2 2z"/></svg>
              Factura
            </button>
          </div>
        </span>
      </td>`;
      tr.innerHTML = row;
      // Ajustes por rol: en cliente mostrar nombre del barbero
      if (!isAdmin) {
        const tds = tr.querySelectorAll("td");
        if (tds[3]) tds[3].textContent = nombre;
      }
      tbody.appendChild(tr);
    });
    if (totalEl) totalEl.textContent = String(count);
  }

  async function cargarPagos() {
    try {
      // Detectar rol para escoger endpoint adecuado
      try {
        const u = await fetch("/api/usuario_actual");
        if (u.ok) {
          const info = await u.json();
          isAdmin = info.rol === "admin" || info.rol === "superadmin";
          window.isAdmin = isAdmin;
        }
      } catch {}
      const endpoint = isAdmin ? "/api/pagos" : "/api/pagos/cliente";
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar pagos");
      pagos = Array.isArray(data) ? data : [];
      render();
    } catch (e) {
      console.error(e);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="11" class="px-6 py-4 text-center text-gray-400">${e.message}</td></tr>`;
      }
    }
  }

  search?.addEventListener("input", render);
  dateFilter?.addEventListener("change", render);
  metodoFilter?.addEventListener("change", render);

  // Toggle orden
  const orderBtn = document.getElementById("pagos-order-toggle");
  const orderIcon = document.getElementById("pagos-order-icon");
  const orderText = document.getElementById("pagos-order-text");
  orderBtn?.addEventListener("click", () => {
    orderByDateDesc = !orderByDateDesc;
    if (orderText)
      orderText.textContent = orderByDateDesc
        ? "Más reciente primero"
        : "Más antiguo primero";
    if (orderIcon)
      orderIcon.innerHTML = orderByDateDesc
        ? '<path d="M12 5v14m0 0l-4-4m4 4l4-4"/>'
        : '<path d="M12 19V5m0 0l4 4m-4-4l-4 4"/>';
    render();
  });

  cargarPagos();

  // Popover de filtros: posicionamiento y cierre
  filterToggle?.addEventListener("click", () => {
    if (!filterPopover || !filterToggle) return;
    filterPopover.classList.remove("hidden");
    setTimeout(() => {
      const rect = filterToggle.getBoundingClientRect();
      const popW = filterPopover.offsetWidth;
      let left = rect.right - popW;
      if (left < 10) left = 10;
      if (left + popW > window.innerWidth - 10)
        left = window.innerWidth - popW - 10;
      filterPopover.style.top = `${rect.bottom + window.scrollY + 5}px`;
      filterPopover.style.left = `${left + window.scrollX}px`;
      if (window.innerWidth < 640) {
        filterPopover.style.left = "50%";
        filterPopover.style.transform = "translateX(-50%)";
      } else {
        filterPopover.style.transform = "none";
      }
    }, 0);
  });

  filterClose?.addEventListener("click", () =>
    filterPopover?.classList.add("hidden")
  );
  filterPopover?.addEventListener("click", (e) => {
    if (e.target.id === "pagos-filter-popover")
      filterPopover.classList.add("hidden");
  });

  // ----- Editar -----
  // Eliminados elementos de edición/eliminación
  let delContextId = null; // mantenido por compatibilidad si algo externo lo usa

  document.addEventListener("click", (e) => {
    const editEl = null; // eliminado
    const delEl = null; // eliminado
    const menuBtn = e.target.closest(".pago-menu");
    const facturaBtn = e.target.closest(".pago-factura");
    // Eliminada lógica de edición y eliminación
    if (menuBtn) {
      const wrap = menuBtn.parentElement;
      const pop = wrap.querySelector(".menu-pop");
      document.querySelectorAll(".menu-pop").forEach((x) => {
        if (x !== pop) x.classList.add("hidden");
      });
      if (pop) pop.classList.toggle("hidden");
    } else if (!e.target.closest(".menu-pop")) {
      document
        .querySelectorAll(".menu-pop")
        .forEach((x) => x.classList.add("hidden"));
    }
    if (facturaBtn) {
      const id = Number(facturaBtn.dataset.id);
      window.open(`/facturas/${id}/descargar`, "_blank");
    }
  });

  // Eliminados listeners de edición

  // ----- Eliminar -----
  // Eliminados listeners de eliminación
});

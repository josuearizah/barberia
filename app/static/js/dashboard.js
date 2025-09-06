document.addEventListener('DOMContentLoaded', function () {
  try {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const toggleIconOpen = document.getElementById('toggle-open');
    const toggleIconClose = document.getElementById('toggle-close');
    const profileBtn = document.getElementById('profile-btn');
    const profileMenu = document.getElementById('profile-menu');
    const collapseBtn = document.getElementById('sidebar-collapse');
    const collapseIcon = document.getElementById('collapse-icon');
    const expandIcon = document.getElementById('expand-icon');
    const mainContent = document.querySelector('.flex.flex-col');

    // Helpers seguros
    const has = (el) => !!el && typeof el.classList !== 'undefined';

    function triggerCalendarResize() {
      // Pequeña demora para permitir que el layout termine de transicionar
      setTimeout(() => {
        try { window.dispatchEvent(new Event('resize')); } catch {}
      }, 150);
    }

    // Abrir sidebar (mobile)
    function openSidebar() {
      if (!has(sidebar)) return;
      sidebar.classList.remove('-translate-x-full');
      if (has(sidebarOverlay)) sidebarOverlay.classList.remove('hidden');
      if (toggleIconOpen) toggleIconOpen.classList.add('hidden');
      if (toggleIconClose) toggleIconClose.classList.remove('hidden');
      triggerCalendarResize();
    }

    // Cerrar sidebar (mobile)
    function closeSidebar() {
      if (!has(sidebar)) return;
      sidebar.classList.add('-translate-x-full');
      if (has(sidebarOverlay)) sidebarOverlay.classList.add('hidden');
      if (toggleIconOpen) toggleIconOpen.classList.remove('hidden');
      if (toggleIconClose) toggleIconClose.classList.add('hidden');
      triggerCalendarResize();
    }

    // Listeners sidebar
    if (sidebarToggle) sidebarToggle.addEventListener('click', openSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // Profile dropdown
    if (profileBtn) {
      profileBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (profileMenu) profileMenu.classList.toggle('hidden');
      });
    }

    // Cierra el menú de perfil al hacer clic fuera
    document.addEventListener('click', function (event) {
      if (profileBtn && profileMenu && !profileBtn.contains(event.target) && !profileMenu.contains(event.target)) {
        profileMenu.classList.add('hidden');
      }
    });

    // Desktop sidebar collapse
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function () {
        if (!has(sidebar)) return;
        sidebar.classList.toggle('collapsed');
        if (collapseIcon) collapseIcon.classList.toggle('hidden');
        if (expandIcon) expandIcon.classList.toggle('hidden');

        if (mainContent) {
          if (sidebar.classList.contains('collapsed')) {
            mainContent.classList.remove('lg:pl-64');
            mainContent.classList.add('lg:pl-16');
          } else {
            mainContent.classList.remove('lg:pl-16');
            mainContent.classList.add('lg:pl-64');
          }
        }
        triggerCalendarResize();
      });
    }

    // Cargar métricas (no bloquea UI si falla)
    cargarMetricasDashboard().catch((e) => console.error('Error métricas:', e));
  } catch (e) {
    console.error('Error inicializando dashboard:', e);
  }
});

async function cargarMetricasDashboard() {
  const elClientes = document.getElementById('stat-clientes');
  const elIngresos = document.getElementById('stat-ingresos');
  const elVistas = document.getElementById('stat-vistas');
  if (!elClientes || !elIngresos || !elVistas) return;

  // Cambiar a la ruta SINGULAR que tienes en metrica.py
  const res = await fetch('/api/metrica/dashboard', { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  elClientes.textContent = data.total_clientes ?? 0;
  elIngresos.textContent = `$${Number(data.total_ingresos ?? 0).toFixed(2)}`;
  elVistas.textContent = data.total_vistas ?? 0;
}

function actualizarEstadoCita(select) {
  const citaId = select.getAttribute('data-cita-id');
  const estado = select.value;

  fetch(`/actualizar_estado_cita/${citaId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `estado=${estado}`
  })
  .then(r => r.json())
  .then(data => {
    if (data.error) {
      mostrarNotificacion(`Error: ${data.error}`, 'error');
      select.value = select.dataset.originalValue || 'pendiente';
    } else {
      const estadoTexto = { pendiente: 'actualizado a Pendiente', confirmado: 'confirmado', cancelado: 'cancelado', completado: 'completado' };
      mostrarNotificacion(`La cita #${citaId} se ha ${estadoTexto[estado] || 'actualizado'}.`, 'success');
      select.dataset.originalValue = estado;
    }
  })
  .catch(() => {
    mostrarNotificacion(`Error de conexión: No se pudo actualizar el estado.`, 'error');
    select.value = select.dataset.originalValue || 'pendiente';
  });
}

function mostrarNotificacion(mensaje, tipo) {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 flex items-center transition-all transform translate-y-0 opacity-100`;
  let icono = '';
  if (tipo === 'success') {
    toast.classList.add('bg-green-600');
    icono = `<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
  } else {
    toast.classList.add('bg-red-600');
    icono = `<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
  }
  toast.innerHTML = `${icono}<span>${mensaje}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }, 100);
}

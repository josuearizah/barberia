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
        // Cerrar submenu historial y ajustar alineación cuando está colapsado
        const historialSubmenu = document.getElementById('historial-submenu');
        const historialCaret = document.getElementById('historial-caret');
        const historialToggle = document.getElementById('historial-toggle');
        if (sidebar.classList.contains('collapsed')) {
          if (historialSubmenu) historialSubmenu.classList.add('hidden');
          if (historialCaret) historialCaret.classList.add('hidden');
          // centrar sólo el ícono en modo colapsado
          if (historialToggle) {
            historialToggle.classList.remove('justify-between');
            historialToggle.classList.add('justify-center');
          }
        } else {
          if (historialCaret) historialCaret.classList.remove('hidden');
          if (historialToggle) {
            historialToggle.classList.add('justify-between');
            historialToggle.classList.remove('justify-center');
          }
        }
        triggerCalendarResize();
      });
    }

    // Cargar métricas (no bloquea UI si falla)
    cargarMetricasDashboard().catch((e) => console.error('Error métricas:', e));

    // Toggle dropdown Historial en sidebar
    const historialToggle = document.getElementById('historial-toggle');
    const historialSubmenu = document.getElementById('historial-submenu');
    const historialCaret = document.getElementById('historial-caret');
    if (historialToggle && historialSubmenu) {
      historialToggle.addEventListener('click', () => {
        // Si sidebar está colapsado, no abrir dropdown
        if (sidebar && sidebar.classList.contains('collapsed')) return;
        historialSubmenu.classList.toggle('hidden');
        if (historialCaret) historialCaret.classList.toggle('rotate-180');
      });
    }

    // Tooltips al pasar el mouse cuando el sidebar está colapsado
    (function initSidebarTooltips() {
      if (!has(sidebar)) return;
      // Crear un tooltip reutilizable
      const tip = document.createElement('div');
      tip.id = 'sidebar-tooltip';
      tip.className = 'hidden fixed z-50 px-2 py-1 text-sm rounded bg-gray-900 text-white border border-gray-700 shadow-lg pointer-events-none';
      document.body.appendChild(tip);

      function getLabel(el) {
        // Buscar texto dentro de .sidebar-text
        const txt = el.querySelector?.('.sidebar-text');
        let label = (txt && txt.textContent) ? txt.textContent.trim() : '';
        if (!label) label = el.getAttribute('aria-label') || el.dataset.label || '';
        return label;
      }

      function showTipFor(el) {
        if (!el) return;
        const label = getLabel(el);
        if (!label) return;
        const rect = el.getBoundingClientRect();
        tip.textContent = label;
        tip.style.top = `${rect.top + window.scrollY + rect.height / 2 - tip.offsetHeight / 2}px`;
        tip.style.left = `${rect.right + window.scrollX + 8}px`;
        tip.classList.remove('hidden');
      }

      function hideTip() {
        tip.classList.add('hidden');
      }

      // Delegación: escuchar anclajes y botones dentro del sidebar
      sidebar.addEventListener('mouseenter', (e) => {
        const target = e.target.closest('a, button');
        if (!target) return;
        if (!sidebar.classList.contains('collapsed')) return; // Sólo cuando está colapsado
        showTipFor(target);
      }, true);

      sidebar.addEventListener('mousemove', (e) => {
        const target = e.target.closest('a, button');
        if (!target || !sidebar.classList.contains('collapsed')) { hideTip(); return; }
        // Actualizar posición mientras se mueve dentro del mismo item
        if (!tip.classList.contains('hidden')) {
          const rect = target.getBoundingClientRect();
          tip.style.top = `${rect.top + window.scrollY + rect.height / 2 - tip.offsetHeight / 2}px`;
          tip.style.left = `${rect.right + window.scrollX + 8}px`;
        }
      }, true);

      sidebar.addEventListener('mouseleave', hideTip, true);
      window.addEventListener('scroll', hideTip, { passive: true });
      window.addEventListener('resize', hideTip, { passive: true });
    })();
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

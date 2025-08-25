document.addEventListener('DOMContentLoaded', function () {
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
  // Abrir sidebar (mobile)
  function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    sidebarOverlay.classList.remove('hidden');
    toggleIconOpen?.classList.add('hidden');
    toggleIconClose?.classList.remove('hidden');
  }

  // Cerrar sidebar (mobile)
  function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('hidden');
    toggleIconOpen?.classList.remove('hidden');
    toggleIconClose?.classList.add('hidden');
  }

  sidebarToggle?.addEventListener('click', openSidebar);
  sidebarClose?.addEventListener('click', closeSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);

  // Profile dropdown
  profileBtn?.addEventListener('click', function (event) {
    event.stopPropagation();
    profileMenu?.classList.toggle('hidden');
  });

  // Cierra el menú de perfil al hacer clic fuera
  document.addEventListener('click', function (event) {
    if (profileBtn && profileMenu && !profileBtn.contains(event.target) && !profileMenu.contains(event.target)) {
      profileMenu.classList.add('hidden');
    }
  });

  // Desktop sidebar collapse
  if (collapseBtn) {
    collapseBtn.addEventListener('click', function () {
      // Alternar la clase collapsed en el sidebar
      sidebar.classList.toggle('collapsed');
      
      // Alternar la visibilidad de los iconos
      collapseIcon?.classList.toggle('hidden');
      expandIcon?.classList.toggle('hidden');
      
      // Ajustar el padding del contenido principal
      if (sidebar.classList.contains('collapsed')) {
        mainContent.classList.remove('lg:pl-64');
        mainContent.classList.add('lg:pl-16');
      } else {
        mainContent.classList.remove('lg:pl-16');
        mainContent.classList.add('lg:pl-64');
      }
    });
  }
});

function actualizarEstadoCita(select) {
  const citaId = select.getAttribute('data-cita-id');
  const estado = select.value;

  fetch(`/actualizar_estado_cita/${citaId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `estado=${estado}`
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      mostrarNotificacion(`Error: ${data.error}`, 'error');
      select.value = select.dataset.originalValue || 'pendiente';
    } else {
      // Mapeo de estados a texto más descriptivo
      const estadoTexto = {
        'pendiente': 'Pendiente',
        'confirmado': 'Confirmado',
        'cancelado': 'Cancelado',
        'completado': 'Completado'
      };
      mostrarNotificacion(`La cita #${citaId} se ha ${estadoTexto[estado]} correctamente.`, 'success');
      select.dataset.originalValue = estado;
    }
  })
  .catch(error => {
    mostrarNotificacion(`Error de conexión: No se pudo actualizar el estado.`, 'error');
    select.value = select.dataset.originalValue || 'pendiente';
  });
}

function mostrarNotificacion(mensaje, tipo) {
  // Crear elemento de notificación
  const toast = document.createElement('div');
  
  // Añadir clases según el tipo
  toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 flex items-center transition-all transform translate-y-0 opacity-100`;
  
  // Icono según tipo
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
  
  // Animar entrada
  setTimeout(() => {
    // Animar salida después de 3 segundos
    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }, 100);
}
document.addEventListener('DOMContentLoaded', function () {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarClose = document.getElementById('sidebar-close');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const toggleIconOpen = document.getElementById('toggle-open');
  const toggleIconClose = document.getElementById('toggle-close');
  const profileBtn = document.getElementById('profile-btn');
  const profileMenu = document.getElementById('profile-menu');

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
    if (!profileBtn.contains(event.target) && !profileMenu.contains(event.target)) {
      profileMenu.classList.add('hidden');
    }
  });

  // Sidebar accordion
  document.querySelectorAll('.acc-toggle').forEach(button => {
    button.addEventListener('click', function () {
      const targetId = button.getAttribute('data-target');
      const content = document.getElementById(targetId);
      const openIcon = button.querySelector('.acc-open');
      const closeIcon = button.querySelector('.acc-close');

      content?.classList.toggle('hidden');
      openIcon?.classList.toggle('hidden');
      closeIcon?.classList.toggle('hidden');
    });
  });
}); 
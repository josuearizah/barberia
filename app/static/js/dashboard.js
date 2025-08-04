document.addEventListener('DOMContentLoaded', function () {
  const sidebar = document.getElementById('application-sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const toggleIconOpen = document.getElementById('toggle-icon-open');
  const toggleIconClose = document.getElementById('toggle-icon-close');
  const profileDropdown = document.getElementById('profile-dropdown');
  const profileMenu = document.getElementById('profile-menu');

  // Sidebar Toggle
  sidebarToggle.addEventListener('click', function () {
    sidebar.classList.toggle('-translate-x-full');
    toggleIconOpen.classList.toggle('hidden');
    toggleIconClose.classList.toggle('hidden');
  });

  // Accordion
  const accordions = document.querySelectorAll('.accordion-toggle');
  accordions.forEach(button => {
    button.addEventListener('click', function () {
      const targetId = button.getAttribute('data-target');
      const content = document.getElementById(targetId);
      const isOpen = button.getAttribute('aria-expanded') === 'true';

      // Toggle accordion state
      button.setAttribute('aria-expanded', !isOpen);
      content.classList.toggle('hidden');

      // Toggle icons
      const openIcon = button.querySelector('.accordion-active\\:block');
      const closeIcon = button.querySelector('.accordion-active\\:hidden');
      openIcon.classList.toggle('hidden');
      closeIcon.classList.toggle('hidden');

      // Set height for smooth transition
      if (!isOpen) {
        content.style.height = content.scrollHeight + 'px';
        setTimeout(() => {
          content.style.height = 'auto';
        }, 300);
      } else {
        content.style.height = content.scrollHeight + 'px';
        setTimeout(() => {
          content.style.height = '0';
        }, 10);
      }
    });
  });

  // Profile Dropdown
  profileDropdown.addEventListener('click', function () {
    profileMenu.classList.toggle('hidden');
    profileMenu.classList.toggle('opacity-0');
    profileMenu.classList.toggle('opacity-100');
  });

  // Close profile menu when clicking outside
  document.addEventListener('click', function (event) {
    if (!profileDropdown.contains(event.target) && !profileMenu.contains(event.target)) {
      profileMenu.classList.add('hidden', 'opacity-0');
      profileMenu.classList.remove('opacity-100');
    }
  });
});
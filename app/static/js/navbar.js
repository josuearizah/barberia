const menuBtn = document.getElementById("menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const overlay = document.getElementById("mobile-overlay");
const bar1 = document.getElementById("bar1");
const bar2 = document.getElementById("bar2");
const bar3 = document.getElementById("bar3");
const authButtons = document.getElementById("auth-buttons");
const mobileAuthButtons = document.getElementById("mobile-auth-buttons");
const mobileLinks = document.querySelectorAll(".mobile-link");
const sectionLinks = document.querySelectorAll('a[href*="#"]');

sectionLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    let url;
    try {
      url = new URL(link.getAttribute('href'), window.location.href);
    } catch (err) {
      return;
    }

    const hash = url.hash;
    if (!hash || hash === '#' || url.pathname !== window.location.pathname) {
      return;
    }

    const targetId = hash.slice(1);
    const targetEl = document.getElementById(targetId);
    if (!targetEl) {
      return;
    }

    event.preventDefault();
    const nav = document.querySelector('nav');
    const offset = nav ? nav.offsetHeight : 0;
    const top = targetEl.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  });
});

let menuOpen = false;
const isLoggedIn = false; // Cambia a true para simular sesión iniciada

// Mostrar botón Reservar si está logueado, sino Iniciar Sesión/Registrarse
if (isLoggedIn) {
  authButtons.innerHTML = `<a href="/reservar" class="bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-md text-white font-medium transition text-sm">Reservar</a>`;
  mobileAuthButtons.innerHTML = `<a href="/reservar" class="block bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-md text-white font-medium text-center transition">Reservar</a>`;
}

// Función para actualizar los avatares del navbar
function deriveInitials(name, fallback = '') {
  if (!name) return fallback;
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || '');
  const combined = letters.join('').slice(0, 2);
  return combined || fallback;
}

function updateNavbarAvatar(imageUrl = null, name = null) {
  const navbarAvatars = document.querySelectorAll('.navbar-avatar');
  const computedInitials = deriveInitials(name, null);

  navbarAvatars.forEach((avatar) => {
    const initialsEl = avatar.querySelector('.navbar-avatar-initials');
    const fallbackInitials = avatar.dataset.initials || initialsEl?.textContent || '';

    if (imageUrl) {
      avatar.style.backgroundImage = `url(${imageUrl})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      avatar.classList.add('navbar-avatar--with-image');
      if (initialsEl) initialsEl.textContent = '';
    } else {
      avatar.style.backgroundImage = '';
      avatar.style.backgroundSize = '';
      avatar.style.backgroundPosition = '';
      avatar.classList.remove('navbar-avatar--with-image');
      if (initialsEl) {
        const value = computedInitials || fallbackInitials;
        initialsEl.textContent = value;
        avatar.dataset.initials = value || avatar.dataset.initials || '';
      }
    }
  });
}

// Cargar datos del usuario para actualizar el avatar
function loadUserData() {
  fetch("/perfil/datos")
    .then((response) => response.json())
    .then((data) => {
      if (!data.success) return;
      const imageUrl = data.profile?.profileImage ?? data.perfil?.imagen ?? null;
      const displayName = data.profile?.name ?? `${(data.usuario?.nombre || '').trim()} ${(data.usuario?.apellido || '').trim()}`.trim();
      updateNavbarAvatar(imageUrl, displayName);
    })
    .catch((error) => {
      console.error("Error al cargar datos del usuario:", error);
    });
}

// Inicializar el avatar al cargar la página
loadUserData();

// Notifications: SSE stream + fallback count poll
function updateNotifBadges(count) {
  const ids = [
    'notif-count',
    'notif-count-menu',
    'notif-count-avatar',
    'notif-count-mobile',
    'notif-count-hamburger'
  ];

  const displayValue = count > 99 ? '99+' : String(count);
  ids
    .map((id) => document.getElementById(id))
    .filter(Boolean)
    .forEach((el) => {
      el.textContent = displayValue;
      if (count) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
}

async function fetchNotifCountOnce() {
  try {
    const res = await fetch('/api/notificaciones/unread_count');
    const data = await res.json();
    updateNotifBadges(data.count || 0);
  } catch (e) {
    // ignore
  }
}

function startSSE() {
  try {
    const es = new EventSource('/api/notificaciones/sse');
    es.addEventListener('init', (e) => {
      try { const d = JSON.parse(e.data); updateNotifBadges(d.count || 0); } catch {}
    });
    es.addEventListener('tick', (e) => {
      try { const d = JSON.parse(e.data); updateNotifBadges(d.count || 0); } catch {}
    });
    es.onerror = () => {
      es.close();
      // fallback polling cada 30s
      fetchNotifCountOnce();
      setInterval(fetchNotifCountOnce, 30000);
    };
  } catch (e) {
    fetchNotifCountOnce();
    setInterval(fetchNotifCountOnce, 30000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Solo iniciar si hay sesión (el backend retornará 401 si no)
  startSSE();
});

// Listener para actualizar el avatar cuando se cambia en perfil.js
document.addEventListener("profileImageUpdated", (event) => {
  updateNavbarAvatar(event.detail.imageUrl, event.detail.name);
});

menuBtn.addEventListener("click", () => {
  menuOpen = !menuOpen;
  mobileMenu.classList.toggle("translate-x-full");
  mobileMenu.classList.toggle("translate-x-0");
  overlay.classList.toggle("hidden");
  if (menuOpen) {
    bar1.classList.add("rotate-45", "translate-y-1.5");
    bar2.classList.add("opacity-0");
    bar3.classList.add("-rotate-45", "-translate-y-1.5");
  } else {
    bar1.classList.remove("rotate-45", "translate-y-1.5");
    bar2.classList.remove("opacity-0");
    bar3.classList.remove("-rotate-45", "-translate-y-1.5");
  }
});

overlay.addEventListener("click", () => {
  menuOpen = false;
  mobileMenu.classList.add("translate-x-full");
  mobileMenu.classList.remove("translate-x-0");
  overlay.classList.add("hidden");
  bar1.classList.remove("rotate-45", "translate-y-1.5");
  bar2.classList.remove("opacity-0");
  bar3.classList.remove("-rotate-45", "-translate-y-1.5");
});

mobileLinks.forEach((link) => {
  link.addEventListener("click", () => {
    menuOpen = false;
    mobileMenu.classList.add("translate-x-full");
    mobileMenu.classList.remove("translate-x-0");
    overlay.classList.add("hidden");
    bar1.classList.remove("rotate-45", "translate-y-1.5");
    bar2.classList.remove("opacity-0");
    bar3.classList.remove("-rotate-45", "-translate-y-1.5");
  });
});

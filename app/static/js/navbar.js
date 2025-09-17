const menuBtn = document.getElementById("menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const overlay = document.getElementById("mobile-overlay");
const bar1 = document.getElementById("bar1");
const bar2 = document.getElementById("bar2");
const bar3 = document.getElementById("bar3");
const authButtons = document.getElementById("auth-buttons");
const mobileAuthButtons = document.getElementById("mobile-auth-buttons");
const mobileLinks = document.querySelectorAll(".mobile-link");

let menuOpen = false;

function setMenuState(open) {
  menuOpen = open;
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Cerrar menú de navegación" : "Abrir menú de navegación");

  mobileMenu.classList.toggle("translate-x-full", !open);
  mobileMenu.classList.toggle("translate-x-0", open);
  overlay.classList.toggle("hidden", !open);

  if (open) {
    bar1.classList.add("rotate-45", "translate-y-1.5");
    bar2.classList.add("opacity-0");
    bar3.classList.add("-rotate-45", "-translate-y-1.5");
  } else {
    bar1.classList.remove("rotate-45", "translate-y-1.5");
    bar2.classList.remove("opacity-0");
    bar3.classList.remove("-rotate-45", "-translate-y-1.5");
  }
}

setMenuState(false);
const isLoggedIn = false; // Cambia a true para simular sesión iniciada

// Mostrar botón Reservar si está logueado, sino Iniciar Sesión/Registrarse
if (isLoggedIn) {
  authButtons.innerHTML = `<a href="/reservar" class="bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-md text-white font-medium transition text-sm">Reservar</a>`;
  mobileAuthButtons.innerHTML = `<a href="/reservar" class="block bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-md text-white font-medium text-center transition">Reservar</a>`;
}

// Función para actualizar los avatares del navbar
function updateNavbarAvatar(imageUrl = null, name = null) {
  const navbarAvatars = document.querySelectorAll(".navbar-avatar");
  navbarAvatars.forEach((avatar) => {
    if (imageUrl) {
      avatar.style.backgroundImage = `url(${imageUrl})`;
      avatar.style.backgroundSize = "cover";
      avatar.style.backgroundPosition = "center";
      avatar.textContent = "";
    } else {
      avatar.style.backgroundImage = "";
      avatar.style.backgroundSize = "";
      avatar.style.backgroundPosition = "";
      if (name) {
        const nameParts = name.split(" ");
        avatar.textContent = (nameParts[0]?.[0] || "").toUpperCase() + (nameParts[1]?.[0] || "").toUpperCase();
      }
    }
  });
}

// Cargar datos del usuario para actualizar el avatar
function loadUserData() {
  fetch("/perfil/datos")
    .then((response) => response.json())
    .then((data) => {
      if (data.success && data.profile) {
        updateNavbarAvatar(data.profile.profileImage, `${data.profile.name}`);
      }
    })
    .catch((error) => {
      console.error("Error al cargar datos del usuario:", error);
    });
}

// Inicializar el avatar al cargar la página
loadUserData();

// Notifications: SSE stream + fallback count poll
function updateNotifBadges(count) {
  const el1 = document.getElementById('notif-count');
  const el2 = document.getElementById('notif-count-menu');
  const el3 = document.getElementById('notif-count-avatar');
  const el4 = document.getElementById('notif-count-mobile');
  [el1, el2, el3, el4].forEach((el) => {
    if (!el) return;
    el.textContent = String(count);
    el.classList.toggle('hidden', !count);
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
  setMenuState(!menuOpen);
});

overlay.addEventListener("click", () => {
  setMenuState(false);
});

mobileLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setMenuState(false);
  });
});
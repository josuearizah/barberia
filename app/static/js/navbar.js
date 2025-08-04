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
const isLoggedIn = false; // Cambia a true para simular sesión iniciada

// Mostrar botón Reservar si está logueado, sino Iniciar Sesión/Registrarse
if (isLoggedIn) {
  authButtons.innerHTML = `<a href="/reservar" class="bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-md text-white font-medium transition text-sm">Reservar</a>`;
  mobileAuthButtons.innerHTML = `<a href="/reservar" class="block bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-md text-white font-medium text-center transition">Reservar</a>`;
}

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
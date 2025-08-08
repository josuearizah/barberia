// main.js
function verificarYReservar() {
    const usuarioLogueado = document.body.getAttribute('data-usuario-logueado') === 'True';
    if (usuarioLogueado) {
        window.location.href = '/reservar_cita';
    } else {
        alert('Debe iniciar sesión para reservar una cita');
        window.location.href = '/login';
    }
}
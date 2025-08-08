document.addEventListener('DOMContentLoaded', function() {
    // Cerrar modal de éxito
    var closeBtn = document.getElementById('close-modal');
    if (closeBtn) {
        closeBtn.onclick = function() {
            document.getElementById('success-modal').classList.add('hidden');
            // Opcional: Redirigir a la página principal después de cerrar
            window.location.href = '/';
        };
    }

    // Cerrar modal de error
    var closeErrorBtn = document.getElementById('close-error-modal');
    if (closeErrorBtn) {
        closeErrorBtn.onclick = function() {
            document.getElementById('error-modal').classList.add('hidden');
        };
    }
});
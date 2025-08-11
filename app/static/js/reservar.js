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

    // Restricciones para el calendario: solo lunes a viernes, mínimo hoy, máximo hoy + 2 meses
    var dateInput = document.getElementById('date');
    if (dateInput) {
        // Establecer fecha mínima a hoy
        var today = new Date();
        var todayStr = today.toISOString().split('T')[0];
        dateInput.min = todayStr;

        // Establecer fecha máxima a hoy + 1 mes
        var maxDate = new Date();
        maxDate.setMonth(today.getMonth() + 1);
        var maxDateStr = maxDate.toISOString().split('T')[0];
        dateInput.max = maxDateStr;

        // Validar que no sea sábado o domingo
        dateInput.addEventListener('change', function() {
            var selectedDate = new Date(this.value);
            var day = selectedDate.getDay();
            if (day === 5 || day === 6) {
                alert('Solo se pueden reservar citas de lunes a viernes.');
                this.value = '';
            }
        });
    }
});
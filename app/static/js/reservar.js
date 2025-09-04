document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM para servicios adicionales
    const primaryServiceSelect = document.getElementById('service_id');
    const addServiceBtn = document.getElementById('add-service-btn');
    const addServiceBtnContainer = document.getElementById('add-service-btn-container');
    const secondServiceContainer = document.getElementById('second-service-container');
    const secondServiceSelect = document.getElementById('second_service_id');
    const removeSecondServiceBtn = document.getElementById('remove-second-service');
    
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
    
    // Lógica para servicios adicionales
    if (primaryServiceSelect) {
        // Actualizar visibilidad del botón al cargar la página
        updateAddServiceButtonVisibility();
        
        // Actualizar visibilidad del botón cuando cambia el servicio principal
        primaryServiceSelect.addEventListener('change', function() {
            updateAddServiceButtonVisibility();
            updateSecondServiceOptions();
        });
    }
    
    // Mostrar el selector de segundo servicio al hacer clic en el botón
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', function() {
            secondServiceContainer.classList.remove('hidden');
            addServiceBtnContainer.classList.add('hidden');
        });
    }
    
    // Eliminar el segundo servicio
    if (removeSecondServiceBtn) {
        removeSecondServiceBtn.addEventListener('click', function() {
            secondServiceSelect.value = '';
            secondServiceContainer.classList.add('hidden');
            addServiceBtnContainer.classList.remove('hidden');
        });
    }
    
    function updateAddServiceButtonVisibility() {
        // Solo mostrar el botón cuando se ha seleccionado un servicio principal
        if (primaryServiceSelect && primaryServiceSelect.value) {
            addServiceBtnContainer.classList.remove('hidden');
        } else if (primaryServiceSelect) {
            addServiceBtnContainer.classList.add('hidden');
            secondServiceContainer.classList.add('hidden');
            if (secondServiceSelect) secondServiceSelect.value = '';
        }
    }
});

// Función para actualizar las opciones del segundo servicio
function updateSecondServiceOptions() {
    const primaryServiceSelect = document.getElementById('service_id');
    const secondServiceSelect = document.getElementById('second_service_id');
    
    if (!primaryServiceSelect || !secondServiceSelect) return;
    
    const selectedServiceId = primaryServiceSelect.value;
    
    // Limpiar opciones actuales
    secondServiceSelect.innerHTML = '<option value="">Selecciona un servicio adicional</option>';
    
    if (selectedServiceId) {
        // Copiar todas las opciones del primer select, excepto la seleccionada
        const servicios = Array.from(primaryServiceSelect.options).filter(option => 
            option.value && option.value !== selectedServiceId
        );
        
        servicios.forEach(option => {
            const newOption = document.createElement('option');
            newOption.value = option.value;
            newOption.text = option.text;
            secondServiceSelect.add(newOption);
        });
    }
}
document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM
  const calendarEl = document.getElementById('calendar');
  const viewBtns = document.querySelectorAll('.view-btn');
  const todayBtn = document.getElementById('today-btn');
  const eventModal = document.getElementById('event-modal');
  const closeModal = document.getElementById('close-modal');
  const monthYearEl = document.getElementById('month-year');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  // Variables globales
  let calendar;
  let allEvents = [];
  let userRole = '';
  let userId = '';

  // Añade este código justo después de las referencias a elementos del DOM (al principio)
    const monthYearSelector = document.createElement('div');
    monthYearSelector.id = 'month-year-selector';
    monthYearSelector.className = 'hidden absolute z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3 w-72';
    document.body.appendChild(monthYearSelector);

    // Añade estos nuevos event listeners después de los otros listeners existentes
    monthYearEl.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Obtener posición actual
    const rect = monthYearEl.getBoundingClientRect();
    
    // Posicionar el selector debajo del texto
    monthYearSelector.style.top = (rect.bottom + window.scrollY + 10) + 'px';
    monthYearSelector.style.left = (rect.left + window.scrollX - 40) + 'px'; // Centrado

    // Obtener fecha actual del calendario
    const currentDate = calendar.getDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Construir interfaz de selección
    monthYearSelector.innerHTML = `
        <div class="text-white text-center font-medium mb-3">Seleccionar fecha</div>
        
        <div class="grid grid-cols-2 gap-3">
        <!-- Selector de mes -->
        <div>
            <label class="block text-sm text-gray-400 mb-1">Mes</label>
            <select id="month-select" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-1 py-1.5">
            ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((mes, index) => 
                `<option value="${index}" ${index === currentMonth ? 'selected' : ''}>${mes}</option>`
            ).join('')}
            </select>
        </div>
        
        <!-- Selector de año -->
        <div>
            <label class="block text-sm text-gray-400 mb-1">Año</label>
            <div class="flex">
            <input type="number" id="year-select" value="${currentYear}" min="2020" max="2050" 
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1.5">
            </div>
        </div>
        </div>
        
        <!-- Botones -->
        <div class="flex justify-end mt-3 gap-2">
        <button id="cancel-date-select" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm">
            Cancelar
        </button>
        <button id="apply-date-select" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm">
            Aplicar
        </button>
        </div>
    `;
    
    // Mostrar el selector
    monthYearSelector.classList.remove('hidden');
    
    // Event listeners para botones
    document.getElementById('cancel-date-select').addEventListener('click', function() {
        monthYearSelector.classList.add('hidden');
    });
    
    document.getElementById('apply-date-select').addEventListener('click', function() {
        const selectedMonth = parseInt(document.getElementById('month-select').value);
        const selectedYear = parseInt(document.getElementById('year-select').value);
        
        // Validar año
        if (selectedYear < 2020 || selectedYear > 2050) {
        alert('Por favor selecciona un año entre 2020 y 2050');
        return;
        }
        
        // Ir a la fecha seleccionada
        calendar.gotoDate(new Date(selectedYear, selectedMonth, 1));
        
        // Cerrar el selector
        monthYearSelector.classList.add('hidden');
    });
    });

    // Cerrar el selector si se hace clic fuera
    document.addEventListener('click', function(e) {
    if (!monthYearEl.contains(e.target) && !monthYearSelector.contains(e.target) && !monthYearSelector.classList.contains('hidden')) {
        monthYearSelector.classList.add('hidden');
    }
    });

    // Modificar el monthYearEl para indicar que es clickeable
    monthYearEl.className += ' cursor-pointer hover:text-rose-300 transition-colors flex items-center';
    monthYearEl.innerHTML = `
    <span id="month-year-text"></span>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
    `;


  // Colores según estado
  const statusColors = {
    'pendiente': {
      backgroundColor: '#f59e0b',
      borderColor: '#d97706',
      textColor: '#ffffff'
    },
    'confirmado': {
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb',
      textColor: '#ffffff'
    },
    'completado': {
      backgroundColor: '#10b981',
      borderColor: '#059669',
      textColor: '#ffffff'
    },
    'cancelado': {
      backgroundColor: '#ef4444',
      borderColor: '#dc2626',
      textColor: '#ffffff'
    }
  };

  // Obtener datos del usuario actual
  async function getCurrentUser() {
    try {
        const response = await fetch('/api/usuario_actual');
        if (!response.ok) throw new Error('Error al obtener usuario');
        const data = await response.json();

        userRole = data.rol;
        userId = data.id;

        // Inicializar calendario
        initCalendar();

    } catch (error) {
        console.error('Error:', error);
    }
  }

  // Cargar citas
  async function loadAppointments() {
    try {
      const response = await fetch('/api/citas');
      if (!response.ok) throw new Error('Error al cargar citas');
      const citas = await response.json();

      // Convertir citas al formato de FullCalendar
      allEvents = citas.map(cita => {
        // Calcular hora de fin (sumando duración del servicio)
        const startHour = cita.hora.split(':')[0];
        const startMin = cita.hora.split(':')[1];
        const endHour = parseInt(startHour) + 1; // Por defecto 1 hora, se podría ajustar según duración real

        // Crear título con información relevante
        let title = '';
        if (userRole === 'admin') {
          title = `${cita.nombre_cliente || cita.usuario_nombre + ' ' + cita.usuario_apellido} - ${cita.servicio_nombre}`;
          if (cita.servicio_adicional_nombre) {
            title += ` + ${cita.servicio_adicional_nombre}`;
          }
        } else {
          title = `${cita.servicio_nombre}`;
          if (cita.servicio_adicional_nombre) {
            title += ` + ${cita.servicio_adicional_nombre}`;
          }
          title += ` con ${cita.barbero_nombre}`;
        }

        return {
          id: cita.id,
          title: title,
          start: `${cita.fecha_cita}T${cita.hora}`,
          end: `${cita.fecha_cita}T${endHour.toString().padStart(2, '0')}:${startMin}`,
          extendedProps: {
            cita: cita
          },
          ...statusColors[cita.estado]
        };
      });

      // Aplicar filtro actual
      filterEvents();

    } catch (error) {
      console.error('Error:', error);
    }
  }

  function filterEvents() {
    if (!calendar) return;

    let filteredEvents = allEvents;

    // Si NO es admin, mostrar solo sus citas
    if (userRole !== 'admin') {
        filteredEvents = allEvents.filter(event => {
        return event.extendedProps.cita.usuario_id == userId;
        });
    }

    calendar.removeAllEvents();
    calendar.addEventSource(filteredEvents);
  }


  // Inicializar el calendario
  function initCalendar() {
    // Agregar esta línea antes de crear el calendario
    document.documentElement.style.setProperty('--fc-page-bg-color', '#1F2937'); // bg-gray-800
    document.documentElement.style.setProperty('--fc-neutral-bg-color', '#374151'); // bg-gray-700
    document.documentElement.style.setProperty('--fc-neutral-text-color', '#F9FAFB'); // text-gray-50
    document.documentElement.style.setProperty('--fc-border-color', 'rgba(255, 255, 255, 0.2)');
    document.documentElement.style.setProperty('--fc-today-bg-color', 'rgba(255, 173, 74, 0.15)'); // rose-500 con opacidad
    document.documentElement.style.setProperty('--fc-event-bg-color', '#4B5563'); // bg-gray-600
    document.documentElement.style.setProperty('--fc-event-border-color', '#6B7280'); // bg-gray-500
    document.documentElement.style.setProperty('--fc-event-text-color', '#FFFFFF');
    document.documentElement.style.setProperty('--fc-button-bg-color', '#374151'); // bg-gray-700
    document.documentElement.style.setProperty('--fc-button-border-color', '#4B5563'); // bg-gray-600
    document.documentElement.style.setProperty('--fc-button-text-color', '#F9FAFB'); // text-gray-50
    document.documentElement.style.setProperty('--fc-button-hover-bg-color', '#4B5563'); // bg-gray-600
    document.documentElement.style.setProperty('--fc-button-hover-border-color', '#6B7280'); // bg-gray-500
    document.documentElement.style.setProperty('--fc-list-event-hover-bg-color', '#4B5563'); // bg-gray-600
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        themeSystem: 'standard', // Importante: usar el sistema de temas estándar
        initialView: 'dayGridMonth',
        locale: 'es',
        headerToolbar: false,
        height: '100%',
        eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
        },
        dayMaxEvents: true,
        eventClick: function(info) {
        showEventDetails(info.event);
        },
        dateClick: function(info) {
        // Si estamos en vista de mes, cambiar a vista de día
        if (calendar.view.type === 'dayGridMonth') {
            calendar.changeView('timeGridDay', info.dateStr);
            updateViewButtons('day');
        }
        },
        slotMinTime: '08:00:00',
        slotMaxTime: '21:00:00',
        scrollTime: '09:00:00',
        businessHours: {
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // 0=Domingo, 1=Lunes, etc.
        startTime: '09:00',
        endTime: '21:00',
        },
        views: {
        dayGridMonth: {
            dayMaxEventRows: 4
        }
        },
        datesSet: function(info) {
        const date = info.view.currentStart;
        const year = date.getFullYear();
        const month = date.getMonth();
        
        // Nombres de meses en español
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        document.getElementById('month-year-text').textContent = `${meses[month]} ${year}`;
        }
    });

    calendar.render();

    // Cargar citas después de renderizar el calendario
    loadAppointments();
    }

  // Mostrar detalles de cita en modal
  function showEventDetails(event) {
    const cita = event.extendedProps.cita;

    // Llenar el modal con los datos de la cita
    document.getElementById('modal-title').textContent = 'Detalles de Cita #' + cita.id;

    // Cliente
    let clienteText = cita.nombre_cliente || `${cita.usuario_nombre} ${cita.usuario_apellido}`;
    if (cita.telefono_cliente || cita.usuario_telefono) {
      clienteText += ` (${cita.telefono_cliente || cita.usuario_telefono})`;
    }
    document.getElementById('modal-cliente').textContent = clienteText;

    // Servicios
    let serviciosText = cita.servicio_nombre;
    if (cita.servicio_adicional_nombre) {
      serviciosText += ` + ${cita.servicio_adicional_nombre}`;
    }
    document.getElementById('modal-servicios').textContent = serviciosText;

    // Fecha y hora
    const fechaFormateada = new Date(cita.fecha_cita).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    document.getElementById('modal-fecha').textContent = `${fechaFormateada} a las ${cita.hora_12h}`;

    // Estado con color
    const estadoEl = document.getElementById('modal-estado');
    estadoEl.textContent = cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1);
    estadoEl.className = 'font-medium';

    // Añadir color según estado
    if (cita.estado === 'pendiente') {
      estadoEl.className += ' text-yellow-200';
    } else if (cita.estado === 'confirmado') {
      estadoEl.className += ' text-blue-500';
    } else if (cita.estado === 'completado') {
      estadoEl.className += ' text-green-500';
    } else if (cita.estado === 'cancelado') {
      estadoEl.className += ' text-red-500';
    }

    // Notas
    const notasContainer = document.getElementById('modal-notas-container');
    const notasEl = document.getElementById('modal-notas');

    if (cita.notas) {
      notasContainer.classList.remove('hidden');
      notasEl.textContent = cita.notas;
    } else {
      notasContainer.classList.add('hidden');
    }

    // Botones de acción según rol y estado
    const actionsContainer = document.getElementById('modal-actions');
    actionsContainer.innerHTML = '';

    if (userRole === 'admin') {
      // Barbero puede cambiar estado
      if (cita.estado === 'pendiente') {
        addActionButton(actionsContainer, 'Confirmar', 'bg-blue-600 hover:bg-blue-700', () => updateAppointmentStatus(cita.id, 'confirmado'));
        addActionButton(actionsContainer, 'Cancelar', 'bg-red-600 hover:bg-red-700', () => updateAppointmentStatus(cita.id, 'cancelado'));
      } else if (cita.estado === 'confirmado') {
        addActionButton(actionsContainer, 'Completar', 'bg-green-600 hover:bg-green-700', () => updateAppointmentStatus(cita.id, 'completado'));
        addActionButton(actionsContainer, 'Cancelar', 'bg-red-600 hover:bg-red-700', () => updateAppointmentStatus(cita.id, 'cancelado'));
      }
    } else {
      // Cliente solo puede cancelar si está pendiente o confirmada
      if (cita.estado === 'pendiente' || cita.estado === 'confirmado') {
        addActionButton(actionsContainer, 'Cancelar Cita', 'bg-red-600 hover:bg-red-700', () => updateAppointmentStatus(cita.id, 'cancelado'));
      }
    }

    // Siempre agregar botón cerrar
    addActionButton(actionsContainer, 'Cerrar', 'bg-gray-600 hover:bg-gray-700', () => closeEventModal());

    // Mostrar el modal
    eventModal.classList.remove('hidden');
  }

  // Función para añadir botón de acción
  function addActionButton(container, text, className, clickHandler) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = `py-2 px-4 rounded-md text-white ${className}`;
    button.addEventListener('click', clickHandler);
    container.appendChild(button);
  }

  // Actualizar estado de cita
  async function updateAppointmentStatus(citaId, newStatus) {
    try {
      const response = await fetch(`/api/citas/${citaId}/estado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado: newStatus })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar estado');
      }

      // Cerrar modal y recargar citas
      closeEventModal();
      loadAppointments();

    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar el estado: ' + error.message);
    }
  }

  // Cerrar modal de detalles
  function closeEventModal() {
    eventModal.classList.add('hidden');
  }

  // Actualizar botones de vista
  function updateViewButtons(activeView) {
    viewBtns.forEach(btn => {
      btn.classList.remove('bg-rose-600', 'hover:bg-rose-700');
      btn.classList.add('bg-gray-700', 'hover:bg-gray-600');
    });

    const activeBtn = document.getElementById(`view-${activeView}`);
    if (activeBtn) {
      activeBtn.classList.remove('bg-gray-700', 'hover:bg-gray-600');
      activeBtn.classList.add('bg-rose-600', 'hover:bg-rose-700');
    }
  }

  viewBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const viewType = this.id.replace('view-', '');
      updateViewButtons(viewType);

      if (viewType === 'month') {
        calendar.changeView('dayGridMonth');
      } else if (viewType === 'week') {
        calendar.changeView('timeGridWeek');
      } else if (viewType === 'day') {
        calendar.changeView('timeGridDay');
      }
    });
  });

  todayBtn.addEventListener('click', function() {
    calendar.today();
  });

  prevBtn.addEventListener('click', function() {
    calendar.prev();
  });

  nextBtn.addEventListener('click', function() {
    calendar.next();
  });

  closeModal.addEventListener('click', closeEventModal);

  // Cerrar modal al hacer clic fuera del contenido
  eventModal.addEventListener('click', function(e) {
    if (e.target === eventModal) {
      closeEventModal();
    }
  });

  // Iniciar la aplicación
  getCurrentUser();
});
function verificarYReservar() {
    const usuarioLogueado = document.body.getAttribute('data-usuario-logueado') === 'True';
    if (usuarioLogueado) {
        window.location.href = '/reservar_cita';
    } else {
        alert('Debe iniciar sesión para reservar una cita');
        window.location.href = '/login';
    }
}

async function cargarServicios() {
    try {
        const response = await fetch('/api/servicios');
        const servicios = await response.json();
        const grid = document.getElementById('servicios-grid');
        grid.innerHTML = '';
        if (!response.ok) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-600">Error al cargar servicios: ' + servicios.error + '</div>';
            return;
        }
        if (servicios.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-600">No hay servicios disponibles.</div>';
            return;
        }
        
        // Añadir estilos para las animaciones
        if (!document.getElementById('discount-animation-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'discount-animation-styles';
            styleEl.textContent = `
                @keyframes scale-pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.03); }
                    100% { transform: scale(1); }
                }
                
                .discount-pulse {
                    animation: scale-pulse 2s infinite ease-in-out;
                    border: 2px solid rgba(225, 29, 72, 0.6);
                }
                
                .discount-tag {
                    z-index: 10;
                }
            `;
            document.head.appendChild(styleEl);
        }
        
        servicios.forEach(s => {
            // Comprobar si tiene descuento
            const tieneDescuento = s.descuento !== null;
            const precioOriginal = Math.round(s.precio);
            let precioFinal = precioOriginal;
            let porcentajeDescuento = '';
            
            // Definir clases condicionales
            let cardClass = 'service-card bg-gray-50 rounded-lg overflow-hidden shadow-md transition duration-300 relative';
            
            if (tieneDescuento) {
                // Añadir clase de animación para servicios con descuento
                cardClass += ' discount-pulse';
                
                precioFinal = Math.round(s.descuento.precio_final);
                
                if (s.descuento.tipo === 'porcentaje') {
                    porcentajeDescuento = `${Math.round(s.descuento.valor)}%`;
                } else {
                    // Si es cantidad fija, calculamos el porcentaje equivalente
                    const descuentoPorcentaje = (s.descuento.valor / precioOriginal) * 100;
                    porcentajeDescuento = `${Math.round(descuentoPorcentaje)}%`;
                }
            }
            
            const div = document.createElement('div');
            div.className = cardClass;
            div.setAttribute('data-aos', 'fade-up');
            
            // HTML del servicio con o sin descuento
            div.innerHTML = `
                <div class="h-56 bg-gray-800 flex items-center justify-center">
                    ${s.imagen_url ? `<img src="${s.imagen_url}" alt="${s.nombre}" class="h-full w-full object-cover" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=Imagen+no+disponible';">` : '<i class="fas fa-cut text-6xl text-rose-600"></i>'}
                </div>
                
                ${tieneDescuento ? `
                    <!-- Etiqueta de descuento (solo porcentaje) -->
                    <div class="absolute top-4 left-0 discount-tag">
                        <div class="bg-rose-600 text-white py-2 px-4 font-bold text-2xl shadow-lg transform -rotate-2">
                            -${porcentajeDescuento}
                        </div>
                    </div>
                ` : ''}
                
                <div class="p-5">
                    <h3 class="text-xl font-bold mb-2">${s.nombre}</h3>
                    <p class="text-gray-600 h-14 overflow-hidden">${s.descripcion || 'Sin descripción'}</p>
                    <div class="flex justify-between items-center">
                        <div>
                            ${tieneDescuento ? `
                                <span class="text-lg line-through text-gray-500 mr-2">$${precioOriginal}</span>
                                <span class="text-xl font-bold text-rose-600">$${precioFinal}</span>
                            ` : `
                                <span class="text-xl font-bold text-rose-600">$${precioOriginal}</span>
                            `}
                        </div>
                        <span class="text-sm text-gray-500">${s.duracion_minutos} min</span>
                    </div>
                </div>
            `;
            grid.appendChild(div);
        });
    } catch (error) {
        document.getElementById('servicios-grid').innerHTML = '<div class="col-span-full text-center text-gray-600">Error al conectar con el servidor: ' + error.message + '</div>';
    }
}

// Función para cargar los estilos en la galería
async function cargarEstilosGaleria() {
    try {
        const response = await fetch('/api/estilos');
        const estilos = await response.json();
        const grid = document.getElementById('estilos-grid');
        
        if (!grid) return; // Salir si no estamos en la página con la galería
        
        grid.innerHTML = '';
        
        if (!response.ok) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-600 py-8">Error al cargar estilos: ' + estilos.error + '</div>';
            return;
        }
        
        // Filtrar solo estilos activos
        const estilosActivos = estilos.filter(e => e.activo !== false);
        
        // Determinar cuántos estilos mostrar (máximo 8)
        const estilosMostrados = estilosActivos.slice(0, 8);
        
        // Llenar con placeholders si hay menos de 8 estilos
        const totalItems = Math.max(estilosMostrados.length, 8);
        
        for (let i = 0; i < totalItems; i++) {
            const div = document.createElement('div');
            div.className = 'gallery-img overflow-hidden rounded-lg shadow-md bg-gray-800';
            
            // Si hay un estilo disponible para esta posición, mostrarlo
            if (i < estilosMostrados.length) {
                const estilo = estilosMostrados[i];
                
                div.innerHTML = `
                    <div class="relative h-64">
                        <div class="flex items-center justify-center h-full w-full">
                            <img 
                                src="${estilo.imagen_url}" 
                                alt="${estilo.nombre || 'Estilo de corte'}" 
                                class="max-h-full max-w-full object-contain"
                                loading="lazy"
                                onerror="this.onerror=null; this.src='https://via.placeholder.com/300x300/374151/6B7280?text=RG4LBarber';"
                            >
                        </div>
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <h3 class="text-white text-lg font-bold">${estilo.nombre || 'Estilo'}</h3>
                            <p class="text-gray-300 text-sm capitalize">${estilo.categoria || 'Corte'}</p>
                        </div>
                    </div>
                `;
            } else {
                // Placeholder para completar la cuadrícula cuando hay menos de 8 estilos
                div.innerHTML = `
                    <div class="relative h-64">
                        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                            <rect width="100" height="100" fill="#374151"></rect>
                            <circle cx="50" cy="35" r="20" fill="#6b7280"></circle>
                            <rect x="30" y="60" width="40" height="30" fill="#4b5563"></rect>
                        </svg>
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <h3 class="text-white text-lg font-bold">Próximamente</h3>
                            <p class="text-gray-300 text-sm">Nuevo estilo</p>
                        </div>
                    </div>
                `;
            }
            
            grid.appendChild(div);
        }
    } catch (error) {
        const grid = document.getElementById('estilos-grid');
        if (grid) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-600 py-8">Error al conectar con el servidor: ' + error.message + '</div>';
        }
    }
}

// Función para cargar los barberos (administradores)
async function cargarBarberos() {
    try {
        const response = await fetch('/api/barberos');
        const barberos = await response.json();
        const grid = document.getElementById('barberos-grid');
        
        if (!grid) return; // Salir si no estamos en la página con el equipo
        
        grid.innerHTML = '';
        
        if (!response.ok) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-600 py-8">Error al cargar el equipo: ' + barberos.error + '</div>';
            return;
        }
        
        if (barberos.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-600 py-8">No hay barberos disponibles en este momento.</div>';
            return;
        }

        // Establecer la clase del grid según la cantidad de barberos
        const numBarberos = barberos.length;
        
        if (numBarberos === 1) {
            grid.className = 'flex justify-center';
        } else if (numBarberos === 2) {
            grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto';
        } else if (numBarberos === 3) {
            grid.className = 'grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto';
        } else {
            grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8';
        }
        
        // Crear las tarjetas para cada barbero
        barberos.forEach(barbero => {
            const card = document.createElement('div');
            
            // Si solo hay un barbero, centrarlo con ancho máximo
            if (numBarberos === 1) {
                card.className = 'w-full max-w-sm';
            }
            
            card.setAttribute('data-aos', 'zoom-in');
            
            // HTML interno de la tarjeta
            const contenidoCard = `
                <div class="bg-gray-50 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
                    <a href="/perfil/${barbero.id}" class="block">
                        <div class="h-64 bg-gray-200 relative">
                            ${barbero.imagen 
                                ? `<img src="${barbero.imagen}" alt="${barbero.nombre}" class="w-full h-full object-cover">`
                                : `<div class="bg-gray-700 h-full w-full flex items-center justify-center">
                                    <span class="text-4xl font-bold text-white">${barbero.nombre.charAt(0)}${barbero.apellido ? barbero.apellido.charAt(0) : ''}</span>
                                  </div>`
                            }
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                <h3 class="text-white text-xl font-bold">${barbero.nombre} ${barbero.apellido || ''}</h3>
                                <p class="text-gray-300">Barbero Profesional</p>
                            </div>
                        </div>
                    </a>
                    
                    <div class="p-5">
                        ${barbero.descripcion 
                            ? `<p class="text-gray-600 mb-4">${barbero.descripcion}</p>` 
                            : `<p class="text-gray-600 mb-4">Profesional con experiencia en barbería.</p>`
                        }
                        
                        ${barbero.redes_sociales && barbero.redes_sociales.length > 0 
                            ? `<div class="flex space-x-4">
                                ${barbero.redes_sociales.map(red => {
                                    const iconClass = obtenerIconoRedSocial(red.red_social);
                                    return `<a href="${red.enlace}" target="_blank" class="text-gray-600 hover:text-rose-600 transition-colors">
                                        <i class="${iconClass} fa-lg"></i>
                                    </a>`;
                                }).join('')}
                              </div>`
                            : ''
                        }
                    </div>
                </div>
            `;
            
            card.innerHTML = contenidoCard;
            grid.appendChild(card);
        });
    } catch (error) {
        const grid = document.getElementById('barberos-grid');
        if (grid) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-600 py-8">Error al conectar con el servidor: ' + error.message + '</div>';
        }
    }
}

// Función auxiliar para obtener el icono correcto según la plataforma
function obtenerIconoRedSocial(plataforma) {
    const iconos = {
        'instagram': 'fab fa-instagram',
        'facebook': 'fab fa-facebook',
        'x': 'fa-brands fa-x-twitter',
        'twitter': 'fab fa-twitter',
        'linkedin': 'fab fa-linkedin',
        'youtube': 'fab fa-youtube',
        'tiktok': 'fab fa-tiktok',
        'whatsapp': 'fab fa-whatsapp'
    };
    
    return iconos[plataforma.toLowerCase()] || 'fas fa-link';
}

// Modificar el evento DOMContentLoaded para incluir la carga de barberos
document.addEventListener('DOMContentLoaded', function() {
    cargarServicios();
    cargarEstilosGaleria();
    cargarBarberos(); // Añadir esta línea para cargar los barberos
});

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

// Cargar servicios al iniciar la página
document.addEventListener('DOMContentLoaded', cargarServicios);
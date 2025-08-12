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
        servicios.forEach(s => {
            const div = document.createElement('div');
            div.className = 'service-card bg-gray-50 rounded-lg overflow-hidden shadow-md transition duration-300';
            div.setAttribute('data-aos', 'fade-up');
            div.innerHTML = `
                <div class="h-56 bg-gray-800 flex items-center justify-center">
                    ${s.imagen_url ? `<img src="${s.imagen_url}" alt="${s.nombre}" class="h-full w-full object-contain">` : '<i class="fas fa-cut text-6xl text-rose-600"></i>'}
                </div>
                <div class="p-6">
                    <h3 class="text-xl font-bold mb-2">${s.nombre}</h3>
                    <p class="text-gray-600 mb-4">${s.descripcion || 'Sin descripción'}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-xl font-bold text-rose-600">$${s.precio}</span>
                        <span class="text-sm text-gray-500">${s.duracion} min</span>
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
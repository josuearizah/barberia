document.addEventListener("DOMContentLoaded", () => {
  let usuarios = []
  let orderAsc = true // Más viejo primero (ID ascendente)
  let currentOpenPopover = null // Track currently open popover

  const searchInput = document.getElementById("search-input")
  const orderToggle = document.getElementById("order-toggle")
  const orderIcon = document.getElementById("order-icon")
  const tableBody = document.getElementById("clientes-table-body")
  const totalClientes = document.getElementById("total-clientes")

  const modalRol = document.getElementById("modal-cambio-rol")
  const modalRolMensaje = document.getElementById("modal-rol-mensaje")
  const cancelRol = document.getElementById("cancel-rol")
  const confirmRol = document.getElementById("confirm-rol")

  const modalEliminar = document.getElementById("modal-eliminar")
  const modalEliminarMensaje = document.getElementById("modal-eliminar-mensaje")
  const cancelEliminar = document.getElementById("cancel-eliminar")
  const confirmEliminar = document.getElementById("confirm-eliminar")

  let currentUserId = null
  let currentAction = null

  function closeAllPopovers() {
    document.querySelectorAll(".popover").forEach((popover) => {
      popover.classList.add("hidden")
    })
    currentOpenPopover = null
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".popover-toggle") && !e.target.closest(".popover")) {
      closeAllPopovers()
    }
  })

  async function cargarUsuarios() {
    try {
      const response = await fetch("/api/usuarios")
      usuarios = await response.json()
      totalClientes.textContent = usuarios.length
      renderTable()
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
      tableBody.innerHTML =
        '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-400">Error al cargar usuarios.</td></tr>'
    }
  }

  function renderTable() {
    tableBody.innerHTML = ""
    let filteredUsuarios = usuarios.filter((user) => {
      const searchTerm = searchInput.value.toLowerCase()
      return (
        `${user.nombre} ${user.apellido}`.toLowerCase().includes(searchTerm) ||
        user.telefono.toLowerCase().includes(searchTerm) ||
        user.correo.toLowerCase().includes(searchTerm)
      )
    })

    // Separar admins y clientes
    const admins = filteredUsuarios.filter((u) => u.rol === "admin")
    const clientes = filteredUsuarios.filter((u) => u.rol === "cliente")

    // Ordenar cada grupo por ID asc/desc
    const sortFn = (a, b) => (orderAsc ? a.id - b.id : b.id - a.id)
    admins.sort(sortFn)
    clientes.sort(sortFn)

    filteredUsuarios = [...admins, ...clientes]

    if (filteredUsuarios.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-400">No hay clientes registrados.</td></tr>'
      return
    }

    filteredUsuarios.forEach((user) => {
      const tr = document.createElement("tr")
      tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${user.id}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${user.nombre} ${user.apellido}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${user.telefono}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${user.correo}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${user.rol}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-center relative">
          <button class="popover-toggle text-gray-400 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-700 transition-colors" data-user-id="${user.id}">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12h.01M12 12h.01M18 12h.01"/>
            </svg>
          </button>
          <div class="popover hidden absolute right-0 z-50 min-w-max border border-gray-600 bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <ul class="py-1">
              <li>
                <button class="cambio-rol flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 w-full text-left transition-colors" data-user-id="${user.id}">
                  <svg class="w-4 h-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                  </svg>
                  <span>${user.rol === "admin" ? "Cambiar a Cliente" : "Cambiar a Admin"}</span>
                </button>
              </li>
              <li>
                <button class="eliminar flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 w-full text-left transition-colors border-t border-gray-700" data-user-id="${user.id}">
                  <svg class="w-4 h-4 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  <span>Eliminar</span>
                </button>
              </li>
            </ul>
          </div>
        </td>
      `
      tableBody.appendChild(tr)
    })

    // Configurar popovers inteligentes que se adaptan a su posición
    document.querySelectorAll(".popover-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation()
        const popover = e.target.closest(".popover-toggle").nextElementSibling

        // Close current popover if different from clicked one
        if (currentOpenPopover && currentOpenPopover !== popover) {
          currentOpenPopover.classList.add("hidden")
        }

        // Si vamos a mostrar el popover, calcular si hay suficiente espacio abajo
        if (popover.classList.contains("hidden")) {
          // Obtener posiciones y dimensiones relevantes
          const btnRect = btn.getBoundingClientRect()
          const tableContainer = document.querySelector('.overflow-x-auto')
          const tableContainerRect = tableContainer.getBoundingClientRect()
          
          // Espacio disponible debajo del botón dentro del contenedor
          const spaceBelow = tableContainerRect.bottom - btnRect.bottom
          // Altura estimada del popover (podría ser más preciso si conocemos la altura exacta)
          const popoverHeight = 120 // altura aproximada en px
          
          // Quitar clases y estilos anteriores
          popover.classList.remove("top-full", "bottom-full")
          popover.style.removeProperty("top")
          popover.style.removeProperty("bottom")
          
          // Si no hay suficiente espacio abajo, mostrar arriba
          if (spaceBelow < popoverHeight) {
            popover.style.bottom = "100%" // Coloca el popover arriba del botón
            popover.style.top = "auto"
            popover.classList.add("mb-1") // Margen para separación
          } else {
            popover.style.top = "100%" // Coloca el popover debajo del botón (por defecto)
            popover.style.bottom = "auto"
            popover.classList.add("mt-1") // Margen para separación
          }
        }

        // Toggle clicked popover
        popover.classList.toggle("hidden")
        currentOpenPopover = popover.classList.contains("hidden") ? null : popover
      })
    })

    // Eventos para cambio de rol
    document.querySelectorAll(".cambio-rol").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        currentUserId = e.target.closest("button").dataset.userId
        currentAction = "rol"
        const user = usuarios.find((u) => u.id == currentUserId)
        modalRolMensaje.textContent = `¿Estás seguro de cambiar el rol de ${user.nombre} ${user.apellido} a ${user.rol === "admin" ? "Cliente" : "Admin"}?`
        modalRol.classList.remove("hidden")
        closeAllPopovers() // Close popover when opening modal
      })
    })

    // Eventos para eliminar
    document.querySelectorAll(".eliminar").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        currentUserId = e.target.closest("button").dataset.userId
        currentAction = "eliminar"
        const user = usuarios.find((u) => u.id == currentUserId)
        modalEliminarMensaje.textContent = `¿Estás seguro de eliminar a ${user.nombre} ${user.apellido}? Esta acción no se puede deshacer.`
        modalEliminar.classList.remove("hidden")
        closeAllPopovers() // Close popover when opening modal
      })
    })
  }

  async function actualizarUsuario(id, datos) {
    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      })
      if (response.ok) {
        await cargarUsuarios()
      } else {
        console.error("Error al actualizar usuario")
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  async function eliminarUsuario(id) {
    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        await cargarUsuarios()
      } else {
        console.error("Error al eliminar usuario")
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  // Eventos de modales
  cancelRol.addEventListener("click", () => modalRol.classList.add("hidden"))
  confirmRol.addEventListener("click", () => {
    if (currentAction === "rol") {
      const user = usuarios.find((u) => u.id == currentUserId)
      const nuevoRol = user.rol === "admin" ? "cliente" : "admin"
      actualizarUsuario(currentUserId, { rol: nuevoRol })
    }
    modalRol.classList.add("hidden")
  })

  cancelEliminar.addEventListener("click", () => modalEliminar.classList.add("hidden"))
  confirmEliminar.addEventListener("click", () => {
    if (currentAction === "eliminar") {
      eliminarUsuario(currentUserId)
    }
    modalEliminar.classList.add("hidden")
  })

  // Buscador
  searchInput.addEventListener("input", renderTable)

  // Filtro de orden
  orderToggle.addEventListener("click", () => {
    orderAsc = !orderAsc
    orderIcon.innerHTML = orderAsc
      ? `<path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m0 0l-4-4m4 4l4-4"/>`
      : `<path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5m0 0l4 4m-4-4l-4 4"/>`
    orderToggle.innerHTML = `
      <svg id="order-icon" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        ${orderIcon.innerHTML}
      </svg>
      ${orderAsc ? "Más viejo primero" : "Más reciente primero"}
    `
    renderTable()
  })

  cargarUsuarios()
})
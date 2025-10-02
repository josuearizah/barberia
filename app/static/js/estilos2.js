(() => {
  const PAGE_SIZE = 10;
  const lista = document.querySelector(".lista-estilos");
  const resumen = document.querySelector(".resumen");
  const paginas = document.querySelector(".paginas");
  const paginacion = document.querySelector(".paginacion");
  const btnPrev = document.querySelector(".btn-prev");
  const btnNext = document.querySelector(".btn-next");
  const buscador = document.querySelector(".buscador");
  const filtroBtns = Array.from(document.querySelectorAll(".btn-cat"));

  let estilos = [];
  let filtrados = [];
  let categoria = "todos";
  let pagina = 1;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function normalizarTexto(t) {
    return (t || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function aplicarFiltros() {
    const termino = normalizarTexto(buscador.value.trim());
    filtrados = estilos
      .filter((e) => e.activo)
      .filter((e) => (categoria === "todos" ? true : e.categoria === categoria))
      .filter((e) =>
        termino ? normalizarTexto(e.nombre).includes(termino) : true
      );

    pagina = 1;
    render();
  }

  function render() {
    const total = filtrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
    pagina = clamp(pagina, 1, totalPaginas);

    const start = (pagina - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const items = filtrados.slice(start, end);

    if (total === 0) {
      lista.innerHTML = `
          <div class="col-span-full text-center py-10 text-gray-500 flex flex-col items-center justify-center">
            No se encontraron estilos para los filtros aplicados.
          </div>`;
    } else {
      lista.innerHTML = items.map(cardHTML).join("");
    }

    resumen.textContent = total
      ? `Mostrando ${start + 1}-${Math.min(end, total)} de ${total} estilos`
      : "";

    renderPaginacion(totalPaginas);
    paginacion.classList.toggle("hidden", total === 0);
    btnPrev.disabled = pagina === 1;
    btnNext.disabled = pagina === totalPaginas;
  }

  function cardHTML(e) {
    const img =
      e.imagen_url || "https://via.placeholder.com/300x200?text=Sin+imagen";
    const catLabel =
      {
        corte: "Corte",
        barba: "Barba",
        lineas: "Líneas",
        disenos: "Diseños",
      }[e.categoria] || e.categoria;

    return `
        <div class="flex">
          <article class="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition w-full">
            <div class="relative bg-gray-800" style="aspect-ratio: 3 / 2;">
              <img src="${img}" alt="${e.nombre}" class="absolute inset-0 w-full h-full object-cover" onerror="this.onerror=null; this.src='https://via.placeholder.com/900x600?text=Sin+imagen';">
            </div>
            <div class="px-3 py-1.5 sm:py-2 flex items-center bg-gray-900 text-white/90 leading-tight">
              <div class="flex items-center justify-between w-full gap-2 sm:gap-3">
                <h3 class="font-semibold text-sm sm:text-base truncate">${e.nombre}</h3>
                <span class="text-[0.65rem] sm:text-xs px-2 py-0.5 sm:py-1 rounded-full bg-gray-700 text-gray-100 border border-gray-600 whitespace-nowrap">${catLabel}</span>
              </div>
            </div>
          </article>
        </div>
      `;
  }

  function renderPaginacion(totalPaginas) {
    const windowSize = 5;
    let start = Math.max(1, pagina - Math.floor(windowSize / 2));
    let end = Math.min(totalPaginas, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    const btns = [];
    if (start > 1) {
      btns.push(pageBtn(1));
      if (start > 2) btns.push(ellipsis());
    }
    for (let p = start; p <= end; p++) btns.push(pageBtn(p));
    if (end < totalPaginas) {
      if (end < totalPaginas - 1) btns.push(ellipsis());
      btns.push(pageBtn(totalPaginas));
    }
    paginas.innerHTML = btns.join("");
    paginas.querySelectorAll("[data-page]").forEach((b) => {
      b.addEventListener("click", () => {
        pagina = parseInt(b.dataset.page, 10);
        render();
      });
    });
  }

  function pageBtn(p) {
    const active =
      p === pagina
        ? "bg-rose-600 text-white border-rose-600"
        : "text-gray-600 hover:bg-gray-300 border-gray-300";
    return `<button data-page="${p}" class="px-3 py-2 rounded-md border text-sm ${active}">${p}</button>`;
  }

  function ellipsis() {
    return `<span class="px-2 text-gray-500 select-none">…</span>`;
  }

  function setActiveCategoria(btn) {
    filtroBtns.forEach((b) => {
      b.classList.remove("bg-gray-300", "text-gray-900", "border-gray-300");
      b.classList.add("text-gray-600");
    });
    btn.classList.add("bg-gray-300", "text-gray-900", "border-gray-300");
    btn.classList.remove("text-gray-600");
  }

  function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  btnPrev.addEventListener("click", () => {
    pagina = Math.max(1, pagina - 1);
    render();
  });
  btnNext.addEventListener("click", () => {
    pagina += 1;
    render();
  });

  buscador.addEventListener("input", debounce(aplicarFiltros, 250));

  filtroBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoria = btn.dataset.cat;
      setActiveCategoria(btn);
      aplicarFiltros();
    });
  });

  async function cargar() {
    try {
      const res = await fetch("/api/estilos");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al cargar estilos");
      estilos = (Array.isArray(data) ? data : []).sort((a, b) => b.id - a.id);
      aplicarFiltros();
    } catch (err) {
      lista.innerHTML = `
          <div class="col-span-full text-center py-10 text-red-400">
            Error al cargar estilos: ${err.message}
          </div>`;
      paginacion.classList.add("hidden");
    }
  }

  cargar();
})();

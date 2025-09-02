document.addEventListener("DOMContentLoaded", async () => {
  const rangoBotones = document.querySelectorAll(".rango-btn");
  const ingresosTotalesEl = document.getElementById("ingresos-totales");
  const citasCompletadasEl = document.getElementById("citas-completadas");
  let tendenciaChart, distribucionChart;
  let rangoActual = "dia";
  let intervalId;

  function mostrarError(mensaje) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "px-4 mb-3 text-red-500 text-center";
    errorDiv.textContent = mensaje;
    document.querySelector(".flex.flex-col").prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  // Helpers fecha local
  function ymd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function parseYMDLocal(yyyy_mm_dd) {
    const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  }
  function parseYMDHMSToLocal(yyyy_mm_dd_hh_mm_ss) {
    const [datePart, timePart] = (yyyy_mm_dd_hh_mm_ss || "").split(" ");
    const [y, m, d] = (datePart || "").split("-").map(Number);
    const [hh, mm, ss] = (timePart || "00:00:00").split(":").map(Number);
    return new Date(
      y || 1970,
      (m || 1) - 1,
      d || 1,
      hh || 0,
      mm || 0,
      ss || 0,
      0
    );
  }

  let usuarioId = null;
  try {
    const response = await fetch("/api/usuario_actual");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    usuarioId = data.id;
  } catch (error) {
    console.error("Error al obtener usuario_id:", error);
    mostrarError(
      "Error al cargar la sesión. Por favor, inicia sesión nuevamente."
    );
    return;
  }

  function getDateRange(rango) {
    const now = new Date();
    const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // inicio del día local

    let fechaInicioDate;
    const fechaFinDate = hoy; // nunca más allá de hoy

    switch (rango) {
      case "dia":
        fechaInicioDate = hoy;
        break;
      case "semana":
        fechaInicioDate = new Date(hoy);
        fechaInicioDate.setDate(hoy.getDate() - 7);
        break;
      case "mes":
        // Último mes móvil: mismo día del mes anterior hasta hoy
        fechaInicioDate = new Date(hoy);
        fechaInicioDate.setMonth(hoy.getMonth() - 1);
        break;
      case "3meses":
        // Últimos 3 meses móviles
        fechaInicioDate = new Date(hoy);
        fechaInicioDate.setMonth(hoy.getMonth() - 3);
        break;
      case "6meses":
        // Últimos 6 meses móviles
        fechaInicioDate = new Date(hoy);
        fechaInicioDate.setMonth(hoy.getMonth() - 6);
        break;
      default:
        fechaInicioDate = new Date(hoy);
        fechaInicioDate.setMonth(hoy.getMonth() - 1);
    }

    return { fechaInicio: ymd(fechaInicioDate), fechaFin: ymd(fechaFinDate) };
  }

  async function cargarDatos(rango = "dia") {
    const { fechaInicio, fechaFin } = getDateRange(rango);

    try {
      const url = `/api/ingresos?barbero_id=${encodeURIComponent(
        usuarioId
      )}&fecha_inicio=${encodeURIComponent(
        fechaInicio
      )}&fecha_fin=${encodeURIComponent(fechaFin)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      ingresosTotalesEl.textContent = `$${parseFloat(data.total || 0).toFixed(
        2
      )}`;
      citasCompletadasEl.textContent = data.citas_completadas || 0;

      const ingresos = Array.isArray(data.ingresos) ? data.ingresos : [];
      const labels = [];
      const valoresPorFecha = [];
      const valoresAcumulados = [];
      let acumulado = 0;

      if (rango === "dia") {
        // Agrupar por hora usando fecha y hora de la cita (local)
        const horas = new Array(24).fill(0);
        for (const i of ingresos) {
          const ts =
            i.fecha_cita_hora ||
            (i.fecha_cita && i.hora ? `${i.fecha_cita} ${i.hora}` : null);
          if (!ts) continue;
          const dt = parseYMDHMSToLocal(ts);
          if (ymd(dt) === fechaInicio) {
            const h = dt.getHours();
            if (h >= 0 && h <= 23) horas[h] += parseFloat(i.monto || 0);
          }
        }

        // Mostrar rango operativo fijo 08:00–21:00
        const startHour = 8;
        const endHour = 21;

        for (let h = startHour; h <= endHour; h++) {
          const hourStr = `${h.toString().padStart(2, "0")}:00`;
          labels.push(hourStr);
          const monto = horas[h] || 0;
          valoresPorFecha.push(monto);
          acumulado += monto;
          valoresAcumulados.push(acumulado);
        }
      } else {
        // Agrupar por día usando fecha de la cita
        const startDate = parseYMDLocal(fechaInicio);
        const endDate = parseYMDLocal(fechaFin);
        const totalesPorDia = new Map();

        if (Array.isArray(data.tendencia) && data.tendencia.length) {
          for (const item of data.tendencia) {
            totalesPorDia.set(item.fecha, parseFloat(item.monto || 0));
          }
        } else {
          for (const i of ingresos) {
            const ts =
              i.fecha_cita_hora ||
              (i.fecha_cita && i.hora ? `${i.fecha_cita} ${i.hora}` : null);
            if (!ts) continue;
            const dt = parseYMDHMSToLocal(ts);
            const clave = ymd(dt);
            totalesPorDia.set(
              clave,
              (totalesPorDia.get(clave) || 0) + parseFloat(i.monto || 0)
            );
          }
        }

        const dIter = new Date(startDate);
        while (dIter <= endDate) {
          const clave = ymd(dIter);
          const labelStr = dIter.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
          });
          labels.push(labelStr);
          const monto = totalesPorDia.get(clave) || 0;
          valoresPorFecha.push(monto);
          acumulado += monto;
          valoresAcumulados.push(acumulado);
          dIter.setDate(dIter.getDate() + 1);
        }
      }

      // Línea (tendencia)
      const lineCanvas = document.getElementById("tendencia-ingresos");
      if (lineCanvas) {
        if (tendenciaChart) tendenciaChart.destroy();

        // Mostrar todas las horas en "día"
        const xTickOpts =
          rango === "dia"
            ? { color: "#e5e7eb", autoSkip: false }
            : {
                color: "#e5e7eb",
                maxTicksLimit: rango === "6meses" ? 12 : 10,
              };

        tendenciaChart = new Chart(lineCanvas, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Ingresos por Fecha",
                data: valoresPorFecha,
                borderColor: "#f43f5e",
                fill: false,
                tension: 0.2,
              },
              {
                label: "Ingresos Acumulados",
                data: valoresAcumulados,
                borderColor: "#3b82f6",
                fill: false,
                tension: 0.2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                title: {
                  display: true,
                  text: rango === "dia" ? "Hora" : "Fecha",
                  color: "#e5e7eb",
                },
                ticks: xTickOpts,
                grid: { display: false },
              },
              y: {
                beginAtZero: true,
                title: { display: true, text: "Monto ($)", color: "#e5e7eb" },
                ticks: { color: "#e5e7eb" },
              },
            },
            plugins: {
              legend: { labels: { color: "#e5e7eb" } },
              tooltip: {
                callbacks: {
                  label: (ctx) => `$${Number(ctx.raw || 0).toFixed(2)}`,
                },
              },
            },
          },
        });
      }

      // Pie (distribución)
      const pieCanvas = document.getElementById("distribucion-servicios");
      if (pieCanvas) {
        if (distribucionChart) distribucionChart.destroy();
        const labelsDistribucion =
          data.distribucion && data.distribucion.length
            ? data.distribucion.map((i) => i.servicio_nombre)
            : ["Sin datos"];
        const valoresDistribucion =
          data.distribucion && data.distribucion.length
            ? data.distribucion.map((i) => parseFloat(i.monto || 0))
            : [1];
        distribucionChart = new Chart(pieCanvas, {
          type: "pie",
          data: {
            labels: labelsDistribucion,
            datasets: [
              {
                data: valoresDistribucion,
                backgroundColor: [
                  "#f43f5e",
                  "#3b82f6",
                  "#10b981",
                  "#f59e0b",
                  "#8b5cf6",
                ],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: "#e5e7eb" } } },
          },
        });
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      mostrarError(
        "Error al cargar los datos. Verifica la conexión o los datos en la base."
      );
    }
  }

  rangoBotones.forEach((boton) => {
    boton.addEventListener("click", () => {
      rangoBotones.forEach((b) => {
        b.classList.remove("active", "bg-rose-500", "hover:bg-rose-600");
        b.classList.add("bg-gray-700", "hover:bg-gray-600");
      });
      boton.classList.add("active", "bg-rose-500", "hover:bg-rose-600");
      boton.classList.remove("bg-gray-700", "hover:bg-gray-600");
      rangoActual = boton.dataset.rango;
      cargarDatos(rangoActual);
    });
  });

  await cargarDatos("dia");
  intervalId = setInterval(() => cargarDatos(rangoActual), 30000);
  window.addEventListener("unload", () => clearInterval(intervalId));
});

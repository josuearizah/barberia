document.addEventListener("DOMContentLoaded", () => {
  const rangoBotones = document.querySelectorAll(".rango-btn");
  const totalEl = document.getElementById("ingresos-totales");
  const citasEl = document.getElementById("citas-completadas");
  let tendenciaChart = null;
  let distribucionChart = null;
  let rangoActual = "dia";
  let intervalId = null;

  const ymd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  const ymdUTC = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  // Convierte una cadena 'YYYY-MM-DD HH:MM:SS' (asumida en UTC) a Date ajustada a Colombia (UTC-5)
  const toColombia = (ts) => {
    if (!ts) return null;
    const [d, t] = ts.split(' ');
    const [y, m, day] = (d || '').split('-').map(Number);
    const [hh, mm, ss] = (t || '00:00:00').split(':').map(Number);
    const utcMs = Date.UTC(y || 1970, (m || 1) - 1, day || 1, hh || 0, mm || 0, ss || 0);
    return new Date(utcMs - 5 * 60 * 60 * 1000); // restar 5 horas
  };
  const parseYMDLocal = (s) => {
    const [y, m, d] = (s || "").split("-").map(Number);
    return new Date(y || 1970, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  };

  function getDateRange(rango) {
    const now = new Date();
    const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let fi = new Date(hoy);
    switch (rango) {
      case "dia":
        fi = hoy; break;
      case "semana":
        fi.setDate(hoy.getDate() - 7); break;
      case "mes":
        fi.setMonth(hoy.getMonth() - 1); break;
      case "3meses":
        fi.setMonth(hoy.getMonth() - 3); break;
      case "6meses":
        fi.setMonth(hoy.getMonth() - 6); break;
      default:
        fi.setMonth(hoy.getMonth() - 1);
    }
    return { fechaInicio: ymd(fi), fechaFin: ymd(hoy) };
  }

  async function cargarDatos(rango = "dia") {
    const { fechaInicio, fechaFin } = getDateRange(rango);
    try {
      // 1) Pagos del cliente (dinero gastado y tendencia)
      const rp = await fetch('/api/pagos/cliente');
      if (!rp.ok) throw new Error(`HTTP ${rp.status}`);
      const pagos = await rp.json();

      const totalGastado = pagos.reduce((a, p) => a + Number(p.total || 0), 0);
      if (totalEl) totalEl.textContent = `$${totalGastado.toFixed(2)}`;
      if (citasEl) citasEl.textContent = String(pagos.length);

      const dentro = pagos.filter(p => {
        const f = (p.fecha_registro || '').split(' ')[0];
        return f >= fechaInicio && f <= fechaFin;
      });

      const labels = [];
      const valores = [];
      const acumulados = [];
      let acum = 0;
      if (rango === 'dia') {
        const horas = new Array(24).fill(0);
        dentro.forEach(p => {
          const dtCol = toColombia(p.fecha_registro || '');
          if (!dtCol) return;
          // comparar por fecha en Colombia (UTC de la fecha ajustada)
          if (ymdUTC(dtCol) !== fechaInicio) return;
          const h = dtCol.getUTCHours();
          if (h >= 0 && h <= 23) horas[h] += Number(p.total || 0);
        });
        for (let h = 8; h <= 21; h++) {
          labels.push(`${String(h).padStart(2, '0')}:00`);
          const monto = horas[h] || 0; valores.push(monto); acum += monto; acumulados.push(acum);
        }
      } else {
        const startDate = parseYMDLocal(fechaInicio);
        const endDate = parseYMDLocal(fechaFin);
        const map = new Map();
        dentro.forEach(p => {
          const f = (p.fecha_registro || '').split(' ')[0];
          map.set(f, (map.get(f) || 0) + Number(p.total || 0));
        });
        const it = new Date(startDate);
        while (it <= endDate) {
          const clave = ymd(it);
          labels.push(it.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
          const monto = map.get(clave) || 0; valores.push(monto); acum += monto; acumulados.push(acum);
          it.setDate(it.getDate() + 1);
        }
      }

      const lineCanvas = document.getElementById('tendencia-ingresos');
      if (lineCanvas) {
        if (tendenciaChart) tendenciaChart.destroy();
        const xTickOpts = rango === 'dia' ? { color: '#e5e7eb', autoSkip: false } : { color: '#e5e7eb', maxTicksLimit: rango === '6meses' ? 12 : 10 };
        tendenciaChart = new Chart(lineCanvas, {
          type: 'line',
          data: { labels, datasets: [
            { label: 'Gastos por Fecha', data: valores, borderColor: '#f43f5e', fill: false, tension: 0.2 },
            { label: 'Gastos Acumulados', data: acumulados, borderColor: '#3b82f6', fill: false, tension: 0.2 },
          ]},
          options: { responsive: true, maintainAspectRatio: false,
            scales: { x: { title: { display: true, text: (rango==='dia'?'Hora':'Fecha'), color: '#e5e7eb' }, ticks: xTickOpts, grid: { display: false } },
                      y: { beginAtZero: true, title: { display: true, text: 'Monto ($)', color: '#e5e7eb' }, ticks: { color: '#e5e7eb' } } },
            plugins: { legend: { labels: { color: '#e5e7eb' } }, tooltip: { callbacks: { label: (ctx)=>`$${Number(ctx.raw||0).toFixed(2)}` } } }
          }
        });
      }

      // 2) Distribución por servicio (consulta historial del cliente)
      const pieCanvas = document.getElementById('distribucion-servicios');
      if (pieCanvas) {
        if (distribucionChart) distribucionChart.destroy();
        let labelsDist = ['Sin datos']; let valoresDist = [1];
        try {
          const rh = await fetch('/api/historial');
          if (rh.ok) {
            const hist = await rh.json();
            const conteo = {};
            hist.forEach(h => {
              if (h.servicio_nombre) conteo[h.servicio_nombre] = (conteo[h.servicio_nombre] || 0) + 1;
              if (h.servicio_adicional_nombre) conteo[h.servicio_adicional_nombre] = (conteo[h.servicio_adicional_nombre] || 0) + 1;
            });
            const keys = Object.keys(conteo);
            if (keys.length) { labelsDist = keys; valoresDist = keys.map(k => conteo[k]); }
          }
        } catch {}
        distribucionChart = new Chart(pieCanvas, {
          type: 'pie',
          data: { labels: labelsDist, datasets: [{ data: valoresDist, backgroundColor: ['#f43f5e','#3b82f6','#10b981','#f59e0b','#8b5cf6'] }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e5e7eb' } } } }
        });
      }
    } catch (e) {
      console.error('Finanzas error:', e);
      const wrap = document.querySelector('.flex.flex-col');
      if (wrap) {
        const div = document.createElement('div');
        div.className = 'px-4 mb-3 text-red-500 text-center';
        div.textContent = 'Error al cargar finanzas';
        wrap.prepend(div); setTimeout(()=>div.remove(), 5000);
      }
    }
  }

  rangoBotones.forEach(btn => {
    btn.addEventListener('click', () => {
      rangoBotones.forEach(b => { b.classList.remove('active','bg-rose-500','hover:bg-rose-600'); b.classList.add('bg-gray-700','hover:bg-gray-600'); });
      btn.classList.add('active','bg-rose-500','hover:bg-rose-600'); btn.classList.remove('bg-gray-700','hover:bg-gray-600');
      rangoActual = btn.dataset.rango || 'dia';
      cargarDatos(rangoActual);
    });
  });

  cargarDatos('dia');
  intervalId = setInterval(()=>cargarDatos(rangoActual), 30000);
  window.addEventListener('unload', ()=>clearInterval(intervalId));
});

/* ============================================================
               LOGÍSTIC - FÉNIX — DEMOSTRACIÓN 
   ============================================================ */

const DB_KEY = 'logistic_fenix_db_v1';
const SESSION_KEY = 'logistic_fenix_session_v1';

let db = null;
let session = null;
let currentView = 'dashboard';
let searchQ = '';
let despachoEditId = null;
let despachoCart = [];

/* ================== DATOS INICIALES ================== */
function buildSeed() {
  return {
    categorias: [
      { id: 1, nombre: 'Cervezas', descripcion: 'Cervezas nacionales e importadas' },
      { id: 2, nombre: 'Licores y Destilados', descripcion: 'Ron, whisky, vodka' },
      { id: 3, nombre: 'Vinos y Espumantes', descripcion: 'Vinos tintos y blancos' },
      { id: 4, nombre: 'Bebidas Gaseosas', descripcion: 'Colas y sodas' },
      { id: 5, nombre: 'Aguas e Hidratantes', descripcion: 'Agua mineral e hidratantes' },
    ],
    sucursales: [
      { id: 1, nombre: 'MATRIZ', ciudad: 'Guayaquil', direccion: 'Víctor Manuel Rendón 723' },
      { id: 2, nombre: 'Sucursal Norte', ciudad: 'Guayaquil', direccion: 'Mucho Lote Av. Primera 456' },
      { id: 3, nombre: 'Sucursal Este', ciudad: 'Guayaquil', direccion: 'Casuarina 789' },
    ],
    proveedores: [
      { id: 1, nombre: 'Cervecería Nacional S.A.', ruc: '0990000001001', telefono: '043700000', email: 'ventas@cna.com', direccion: 'Guayaquil' },
      { id: 2, nombre: 'Ambev Ecuador', ruc: '0990000002001', telefono: '043700001', email: 'ventas@ambev.com', direccion: 'Guayaquil' },
      { id: 3, nombre: 'Arca Continental', ruc: '0990000003001', telefono: '022500000', email: 'ventas@arca.com', direccion: 'Quito' },
      { id: 4, nombre: 'Tesalia CBC', ruc: '1790000004001', telefono: '022400000', email: 'ventas@tesalia.com', direccion: 'Quito' },
    ],
    productos: [
      { id: 1, nombre: 'Pilsener Clásica 330ml', codigo_barras: '7861000100011', precio: 1.25, stock: 480, fecha_caducidad: '2027-06-30', categoria_id: 1, sucursal_id: 1, proveedor_id: 1, tipo_empaque: 'Lata', unidades_por_empaque: 1, activo: true },
      { id: 2, nombre: 'Club Premium 330ml', codigo_barras: '7861000100035', precio: 1.50, stock: 240, fecha_caducidad: '2027-05-31', categoria_id: 1, sucursal_id: 1, proveedor_id: 1, tipo_empaque: 'Botella', unidades_por_empaque: 1, activo: true },
      { id: 3, nombre: 'Coca-Cola Original 500ml', codigo_barras: '7861000400012', precio: 0.90, stock: 600, fecha_caducidad: '2027-03-31', categoria_id: 4, sucursal_id: 1, proveedor_id: 3, tipo_empaque: 'Botella', unidades_por_empaque: 1, activo: true },
      { id: 4, nombre: 'Ron San Miguel 750ml', codigo_barras: '7861000200018', precio: 8.50, stock: 60, fecha_caducidad: '2029-12-31', categoria_id: 2, sucursal_id: 2, proveedor_id: 4, tipo_empaque: 'Botella', unidades_por_empaque: 1, activo: true },
      { id: 5, nombre: 'Pony Malta 330ml', codigo_barras: '7861000100097', precio: 1.00, stock: 240, fecha_caducidad: '2027-04-30', categoria_id: 1, sucursal_id: 1, proveedor_id: 2, tipo_empaque: 'Botella', unidades_por_empaque: 1, activo: true },
      { id: 6, nombre: 'Heineken 330ml', codigo_barras: '7861000100059', precio: 2.20, stock: 180, fecha_caducidad: '2027-07-31', categoria_id: 1, sucursal_id: 2, proveedor_id: 2, tipo_empaque: 'Botella', unidades_por_empaque: 1, activo: true },
    ],
    usuarios: [
      { id: 1, username: 'admin', password: 'admin123', nombre_completo: 'Administrador General', sucursal_id: null, es_admin: true, fecha_creacion: '2026-01-01' },
      { id: 2, username: 'stan_villao', password: 'user123', nombre_completo: 'stan villao', sucursal_id: 2, es_admin: false, fecha_creacion: '2025-05-27' },
      { id: 3, username: 'jandry_victores', password: 'user123', nombre_completo: 'Jandry Victores', sucursal_id: 3, es_admin: false, fecha_creacion: '2025-05-28' },
    ],
    despachos: [],
    despacho_detalle: [],
    movimientos: [],
  };
}

/* ================== BASE DE DATOS LOCAL ================== */
function initDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try { db = JSON.parse(raw); return; } catch (e) { /* reiniciar datos */ }
  }
  db = buildSeed();
  // Kardex inicial: ENTRADA por inventario inicial de cada producto
  db.productos.forEach(p => {
    if (p.stock > 0) {
      db.movimientos.push({
        id: db.movimientos.length + 1,
        producto_id: p.id,
        usuario_id: 1,
        usuario_nombre: 'admin',
        tipo_movimiento: 'ENTRADA',
        cantidad: p.stock,
        saldo_actual: p.stock,
        motivo: 'INVENTARIO INICIAL (carga del sistema)',
        fecha_movimiento: '2026-01-01T08:00:00',
      });
    }
  });
  saveDB();
}

function saveDB() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function resetDemo() {
  if (!confirm('¿Borrar TODOS los datos de la demostración y reiniciar?')) return;
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

/* ================== FUNCIONES AUXILIARES ================== */
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; }
function fmtMoney(n) { return '$' + Number(n).toFixed(2); }
function fmtDT(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-EC') + ' ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}
function fmtD(iso) {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
  return d.toLocaleDateString('es-EC');
}
function catName(id) { const c = db.categorias.find(x => x.id === id); return c ? c.nombre : '—'; }
function sucName(id) { const s = db.sucursales.find(x => x.id === id); return s ? s.nombre : '—'; }
function provName(id) { const p = db.proveedores.find(x => x.id === id); return p ? p.nombre : '—'; }

function toast(msg, type = 'success') {
  const colors = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning text-dark', info: 'bg-info text-dark' };
  const div = document.createElement('div');
  div.className = `toast align-items-center text-white ${colors[type]} border-0 show mb-2`;
  div.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.closest('.toast').remove()"></button></div>`;
  document.getElementById('toast-container').appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

/* ================== KARDEX ================== */
function registrarMovimiento(producto_id, tipo, cantidad, motivo) {
  const prod = db.productos.find(p => p.id === producto_id);
  if (!prod) return { ok: false, error: 'Producto no encontrado' };
  if (tipo === 'SALIDA' && prod.stock < cantidad) {
    return { ok: false, error: `Existencias insuficientes. Disponible: ${prod.stock}` };
  }
  if (tipo === 'ENTRADA') prod.stock += cantidad;
  else if (tipo === 'SALIDA') prod.stock -= cantidad;

  db.movimientos.push({
    id: nextId(db.movimientos),
    producto_id,
    usuario_id: session ? session.id : null,
    usuario_nombre: session ? session.username : 'sistema',
    tipo_movimiento: tipo,
    cantidad,
    saldo_actual: prod.stock,
    motivo,
    fecha_movimiento: new Date().toISOString(),
  });
  saveDB();
  return { ok: true, saldo: prod.stock };
}

/* ================== AUTENTICACIÓN ================== */
function doLogin(username, password) {
  const u = db.usuarios.find(x => x.username === username && x.password === password);
  if (!u) return { ok: false, error: 'Credenciales incorrectas' };
  session = { id: u.id, username: u.username, nombre_completo: u.nombre_completo, sucursal_id: u.sucursal_id, es_admin: u.es_admin };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true };
}
function logout() { session = null; localStorage.removeItem(SESSION_KEY); currentView = 'dashboard'; render(); }
function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const r = doLogin(u, p);
  if (!r.ok) { document.getElementById('login-error').innerHTML = `<div class="alert alert-danger py-2">${r.error}</div>`; return; }
  render();
}

/* ================== NAVEGACIÓN ================== */
function nav(v) { currentView = v; searchQ = ''; despachoEditId = null; despachoCart = []; render(); }
function setSearch(v) { searchQ = v; render(); }

/* ================== VENTANA MODAL ================== */
function openModal(title, body, onSubmit, saveLabel = 'Guardar', size = '') {
  document.getElementById('modal-container').innerHTML = `
    <div class="modal show d-block" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this) closeModal()">
      <div class="modal-dialog ${size}">
        <div class="modal-content">
          <div class="modal-header theme-red">
            <h5 class="modal-title">${title}</h5>
            <button class="btn-close btn-close-white" onclick="closeModal()"></button>
          </div>
          <form id="modal-form">
            <div class="modal-body">${body}</div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
              <button type="submit" class="btn theme-red-btn">${saveLabel}</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
  const form = document.getElementById('modal-form');
  form.onsubmit = (e) => { e.preventDefault(); onSubmit(form); };
}
function closeModal() { document.getElementById('modal-container').innerHTML = ''; }

/* ================== RENDERIZADO PRINCIPAL ================== */
function render() {
  const app = document.getElementById('app');
  if (!session) { app.innerHTML = loginHTML(); return; }
  app.innerHTML = appHTML();
}

function loginHTML() {
  return `
    <div class="login-bg d-flex align-items-center justify-content-center min-vh-100">
      <div class="card shadow-lg tarjeta-login" style="width:420px">
        <div class="card-header theme-red text-center py-3">
          <h4 class="mb-0"><i class="bi bi-truck"></i> FÉNIX - LOGÍSTIC</h4>
        </div>
        <div class="card-body p-4">
          <h5 class="text-center mb-4">Iniciar Sesión</h5>
          <div id="login-error"></div>
          <form onsubmit="handleLogin(event)">
            <div class="mb-3">
              <label class="form-label fw-bold">Usuario</label>
              <input type="text" id="login-user" class="form-control" required autofocus>
            </div>
            <div class="mb-3">
              <label class="form-label fw-bold">Contraseña</label>
              <input type="password" id="login-pass" class="form-control" required>
            </div>
            <button type="submit" class="btn theme-red-btn w-100 mt-2">Ingresar</button>
          </form>
          <div class="alert alert-info mt-3 mb-0 small">
            <strong>Usuarios de demostración:</strong><br>
            👤 <code>admin / admin123</code> (administrador)<br>
            👤 <code>stan_villao / user123</code> (vendedor · Sucursal Norte)
          </div>
        </div>
        <div class="card-footer text-center text-muted small">© 2026 STAN-SOLUTIONS — Demostración</div>
      </div>
    </div>`;
}

function appHTML() {
  return `${navbarHTML()}<div class="container-fluid py-3">${viewCurrent()}</div>`;
}

function navbarHTML() {
  const badge = session.sucursal_id
    ? `<span class="badge bg-light text-dark ms-2">${sucName(session.sucursal_id)}</span>` : '';
  const adminLinks = session.es_admin ? `
    <li class="nav-item"><a class="nav-link ${currentView==='sucursales'?'active':''}" href="#" onclick="nav('sucursales');return false"><i class="bi bi-shop-window"></i> Locales</a></li>
    <li class="nav-item"><a class="nav-link ${currentView==='proveedores'?'active':''}" href="#" onclick="nav('proveedores');return false"><i class="bi bi-person-badge"></i> Proveedores</a></li>
    <li class="nav-item"><a class="nav-link ${currentView==='usuarios'?'active':''}" href="#" onclick="nav('usuarios');return false"><i class="bi bi-people"></i> Usuarios</a></li>
  ` : '';
  return `
    <nav class="navbar navbar-expand-lg navbar-logistic shadow-sm">
      <div class="container-fluid">
        <a class="navbar-brand fw-bold" href="#" onclick="nav('dashboard');return false"><i class="bi bi-shop"></i> PANEL PRINCIPAL</a>
        <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navMain"><span class="navbar-toggler-icon"></span></button>
        <div class="collapse navbar-collapse" id="navMain">
          <ul class="navbar-nav me-auto">
            <li class="nav-item"><a class="nav-link ${currentView==='productos'?'active':''}" href="#" onclick="nav('productos');return false"><i class="bi bi-box"></i> Productos</a></li>
            <li class="nav-item"><a class="nav-link ${currentView==='categorias'?'active':''}" href="#" onclick="nav('categorias');return false"><i class="bi bi-tags"></i> Categorías</a></li>
            <li class="nav-item"><a class="nav-link ${currentView==='despachos'?'active':''}" href="#" onclick="nav('despachos');return false"><i class="bi bi-truck"></i> Despachos</a></li>
            ${adminLinks}
          </ul>
          <div class="dropdown">
            <button class="btn btn-outline-light dropdown-toggle" data-bs-toggle="dropdown">
              <i class="bi bi-person-circle"></i> ${session.username} ${badge}
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><span class="dropdown-item-text small text-muted">Conectado como<br><strong>${session.nombre_completo}</strong></span></li>
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item text-warning" onclick="resetDemo()"><i class="bi bi-arrow-counterclockwise"></i> Reiniciar demostración</button></li>
              <li><button class="dropdown-item text-danger" onclick="logout()"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</button></li>
            </ul>
          </div>
        </div>
      </div>
    </nav>`;
}

function viewCurrent() {
  switch (currentView) {
    case 'dashboard': return viewDashboard();
    case 'productos': return viewProductos();
    case 'categorias': return viewCategorias();
    case 'sucursales': return viewSucursales();
    case 'proveedores': return viewProveedores();
    case 'usuarios': return viewUsuarios();
    case 'despachos': return despachoEditId !== null || despachoCart.length > 0 || currentView === 'despachos-form'
      ? viewDespachoForm() : viewDespachos();
    default: return viewDashboard();
  }
}

/* ================== VISTA: PANEL PRINCIPAL ================== */
function viewDashboard() {
  const totalProductos = db.productos.filter(p => p.activo).length;
  const totalStock = db.productos.reduce((s, p) => s + p.stock, 0);
  const despPendientes = db.despachos.filter(d => d.estado === 'PENDIENTE').length;
  const movsHoy = db.movimientos.filter(m => m.fecha_movimiento.startsWith(new Date().toISOString().slice(0,10))).length;

  const cards = [
    { icon: 'box', title: 'Productos', value: totalProductos, color: 'success' },
    { icon: 'boxes', title: 'Existencias totales', value: totalStock, color: 'primary' },
    { icon: 'truck', title: 'Despachos pendientes', value: despPendientes, color: 'warning' },
    { icon: 'clock-history', title: 'Movimientos hoy', value: movsHoy, color: 'info' },
  ];

  return `
    <div class="row g-3 mb-4">
      <div class="col-md-6">
        <div class="p-3 rounded shadow-sm text-white theme-red">
          <h3 class="fw-bold"><i class="bi bi-shop"></i> LOGÍSTICA - FÉNIX</h3>
          <p class="mb-0">Gestión de Productos + Kardex</p>
        </div>
      </div>
      <div class="col-md-5 ms-auto">
        <div class="p-3 rounded shadow-sm text-white theme-red">
          <h4 class="fw-bold mb-1"><i class="bi bi-person-circle"></i> Bienvenido</h4>
          <h5>${session.nombre_completo}</h5>
          <span class="badge bg-light text-dark">${session.es_admin ? 'Administrador' : 'Vendedor'}${session.sucursal_id ? ' · ' + sucName(session.sucursal_id) : ''}</span>
        </div>
      </div>
    </div>

    <div class="row g-3 mb-4">
      ${cards.map(c => `
        <div class="col-md-3">
          <div class="tarjeta-modulo">
            <i class="bi bi-${c.icon} text-${c.color}"></i>
            <h6 class="text-muted mb-1">${c.title}</h6>
            <h3 class="mb-0">${c.value}</h3>
          </div>
        </div>`).join('')}
    </div>

    <div class="row g-3">
      <div class="col-md-3"><a href="#" class="tarjeta-modulo" onclick="nav('productos');return false"><i class="bi bi-box"></i><h5>Productos</h5><p class="text-muted small mb-0">Ver inventario</p></a></div>
      <div class="col-md-3"><a href="#" class="tarjeta-modulo" onclick="nav('categorias');return false"><i class="bi bi-tags"></i><h5>Categorías</h5><p class="text-muted small mb-0">Organizar productos</p></a></div>
      <div class="col-md-3"><a href="#" class="tarjeta-modulo" onclick="nav('despachos');return false"><i class="bi bi-truck"></i><h5>Despachos</h5><p class="text-muted small mb-0">Gestionar envíos</p></a></div>
      ${session.es_admin ? `<div class="col-md-3"><a href="#" class="tarjeta-modulo" onclick="nav('usuarios');return false"><i class="bi bi-people"></i><h5>Usuarios</h5><p class="text-muted small mb-0">Administrar accesos</p></a></div>` : ''}
    </div>`;
}

/* ================== VISTA: PRODUCTOS ================== */
function viewProductos() {
  let lista = db.productos.filter(p => p.activo);
  if (!session.es_admin && session.sucursal_id) lista = lista.filter(p => p.sucursal_id === session.sucursal_id);
  if (searchQ) lista = lista.filter(p => p.nombre.toLowerCase().includes(searchQ.toLowerCase()) || p.codigo_barras.includes(searchQ));

  const rows = lista.map(p => {
    const hoy = new Date().toISOString().slice(0,10);
    const vencido = p.fecha_caducidad && p.fecha_caducidad < hoy;
    const stockBajo = p.stock <= 10;
    const clase = vencido ? 'fila-vencida' : (stockBajo ? 'fila-stock-bajo' : '');
    return `
      <tr class="${clase}">
        <td><code>${p.codigo_barras}</code></td>
        <td><strong>${p.nombre}</strong></td>
        <td>${fmtMoney(p.precio)}</td>
        <td><span class="badge ${stockBajo ? 'bg-danger' : 'bg-success'}">${p.stock}</span></td>
        <td>${fmtD(p.fecha_caducidad)} ${vencido ? '<span class="badge bg-danger ms-1">Vencido</span>' : ''}</td>
        <td>${provName(p.proveedor_id)}</td>
        <td>${catName(p.categoria_id)}</td>
        <td>${sucName(p.sucursal_id)}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-primary" onclick="openProductoForm(${p.id})" title="Editar"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-sm btn-outline-info" onclick="abrirKardex(${p.id})" title="Kardex"><i class="bi bi-clock-history"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="eliminarProducto(${p.id})" title="Desactivar"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="card shadow">
      <div class="card-header theme-red d-flex justify-content-between align-items-center">
        <h4 class="mb-0"><i class="bi bi-box-seam"></i> Inventario de Productos</h4>
        <button class="btn btn-light" onclick="openProductoForm()"><i class="bi bi-plus-circle"></i> Nuevo Producto</button>
      </div>
      <div class="card-body">
        <input type="text" class="form-control mb-3" placeholder="Buscar por nombre o código..." value="${searchQ}" oninput="setSearch(this.value)">
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead class="table-light"><tr>
              <th>Código</th><th>Nombre</th><th>Precio</th><th>Existencias</th><th>Caducidad</th><th>Proveedor</th><th>Categoría</th><th>Sucursal</th><th>Acciones</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="9" class="text-center text-muted">Sin productos</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function openProductoForm(id) {
  const p = id ? db.productos.find(x => x.id === id) : null;
  const cats = db.categorias.map(c => `<option value="${c.id}" ${p && p.categoria_id === c.id ? 'selected' : ''}>${c.nombre}</option>`).join('');
  const sucs = db.sucursales.map(s => `<option value="${s.id}" ${p && p.sucursal_id === s.id ? 'selected' : ''}>${s.nombre}</option>`).join('');
  const provs = db.proveedores.map(x => `<option value="${x.id}" ${p && p.proveedor_id === x.id ? 'selected' : ''}>${x.nombre}</option>`).join('');

  openModal(
    p ? `Editar Producto #${id}` : 'Nuevo Producto',
    `<div class="row g-3">
      <div class="col-md-6"><label class="form-label">Nombre*</label><input class="form-control" name="nombre" value="${p ? p.nombre : ''}" required></div>
      <div class="col-md-6"><label class="form-label">Código de barras*</label><input class="form-control" name="codigo" value="${p ? p.codigo_barras : ''}" required></div>
      <div class="col-md-4"><label class="form-label">Precio*</label><input type="number" step="0.01" min="0.01" class="form-control" name="precio" value="${p ? p.precio : ''}" required></div>
      <div class="col-md-4"><label class="form-label">Existencias iniciales ${p ? '<small class="text-muted">(solo lectura)</small>' : '*'}</label><input type="number" min="0" class="form-control" name="stock" value="${p ? p.stock : ''}" ${p ? 'disabled' : 'required'}></div>
      <div class="col-md-4"><label class="form-label">Caducidad*</label><input type="date" class="form-control" name="fecha" value="${p ? p.fecha_caducidad : ''}" required></div>
      <div class="col-md-4"><label class="form-label">Categoría*</label><select class="form-select" name="categoria" required>${cats}</select></div>
      <div class="col-md-4"><label class="form-label">Sucursal*</label><select class="form-select" name="sucursal" required ${!session.es_admin ? 'disabled' : ''}>${sucs}</select></div>
      <div class="col-md-4"><label class="form-label">Proveedor*</label><select class="form-select" name="proveedor" required>${provs}</select></div>
      <div class="col-md-6"><label class="form-label">Tipo de empaque</label><input class="form-control" name="empaque" value="${p ? p.tipo_empaque : 'Unidad'}"></div>
      <div class="col-md-6"><label class="form-label">Unidades / empaque</label><input type="number" min="1" class="form-control" name="unidades" value="${p ? p.unidades_por_empaque : 1}"></div>
    </div>`,
    (form) => {
      const d = Object.fromEntries(new FormData(form));
      const nuevaSucursal = session.es_admin ? parseInt(d.sucursal) : (session.sucursal_id || parseInt(d.sucursal));
      if (p) {
        p.nombre = d.nombre; p.codigo_barras = d.codigo; p.precio = parseFloat(d.precio);
        p.fecha_caducidad = d.fecha; p.categoria_id = parseInt(d.categoria);
        p.sucursal_id = nuevaSucursal; p.proveedor_id = parseInt(d.proveedor);
        p.tipo_empaque = d.empaque; p.unidades_por_empaque = parseInt(d.unidades);
        saveDB(); toast('Producto actualizado'); closeModal(); render();
      } else {
        const stockIni = parseInt(d.stock);
        const nuevo = {
          id: nextId(db.productos), nombre: d.nombre, codigo_barras: d.codigo,
          precio: parseFloat(d.precio), stock: 0, fecha_caducidad: d.fecha,
          categoria_id: parseInt(d.categoria), sucursal_id: nuevaSucursal,
          proveedor_id: parseInt(d.proveedor), tipo_empaque: d.empaque,
          unidades_por_empaque: parseInt(d.unidades), activo: true,
        };
        db.productos.push(nuevo);
        saveDB();
        if (stockIni > 0) registrarMovimiento(nuevo.id, 'ENTRADA', stockIni, 'CREACIÓN DE PRODUCTO / INVENTARIO INICIAL');
        toast('Producto creado y registrado en Kardex'); closeModal(); render();
      }
    },
    p ? 'Guardar cambios' : 'Crear producto', 'modal-lg'
  );
}

function eliminarProducto(id) {
  if (!confirm('¿Desactivar este producto? Dejará de aparecer en el inventario.')) return;
  const p = db.productos.find(x => x.id === id);
  if (p) { p.activo = false; saveDB(); toast('Producto desactivado', 'warning'); render(); }
}

/* ================== VISTA: KARDEX ================== */
function abrirKardex(id) {
  const p = db.productos.find(x => x.id === id);
  if (!p) return;
  const movs = db.movimientos.filter(m => m.producto_id === id).sort((a,b) => new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento));
  const rows = movs.map(m => `
    <tr>
      <td class="text-nowrap">${fmtDT(m.fecha_movimiento)}</td>
      <td><span class="badge ${m.tipo_movimiento==='ENTRADA'?'bg-success':'bg-danger'}">${m.tipo_movimiento}</span></td>
      <td>${m.motivo}</td>
      <td class="fw-bold">${m.tipo_movimiento==='ENTRADA'?'+':'-'}${m.cantidad}</td>
      <td><span class="badge bg-secondary">${m.saldo_actual}</span></td>
      <td>${m.usuario_nombre}</td>
    </tr>`).join('');

  document.getElementById('modal-container').innerHTML = `
    <div class="modal show d-block" style="background:rgba(0,0,0,0.6)" onclick="if(event.target===this) closeModal()">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-dark text-white">
            <h5 class="modal-title"><i class="bi bi-clock-history"></i> Kardex: ${p.nombre}</h5>
            <button class="btn-close btn-close-white" onclick="closeModal()"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info py-2 mb-3">
              <strong>Existencias actuales:</strong> ${p.stock} ${p.tipo_empaque}(s) · <strong>Total de movimientos:</strong> ${movs.length}
            </div>
            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle">
                <thead class="table-light"><tr>
                  <th>Fecha</th><th>Tipo</th><th>Motivo</th><th>Cant.</th><th>Saldo</th><th>Usuario</th>
                </tr></thead>
                <tbody>${rows || '<tr><td colspan="6" class="text-center text-muted">Sin movimientos</td></tr>'}</tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-warning" onclick="ajusteKardex(${p.id})"><i class="bi bi-sliders"></i> Ajuste manual (demostración)</button>
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>`;
}

function ajusteKardex(pid) {
  openModal('Ajuste manual de Kardex', `
    <div class="alert alert-warning small mb-3"><i class="bi bi-info-circle"></i> En el sistema real esto será el módulo de <strong>mermas / salidas</strong> (etapa final).</div>
    <div class="mb-3"><label class="form-label">Tipo*</label>
      <select class="form-select" name="tipo" required>
        <option value="SALIDA">SALIDA (restar existencias)</option>
        <option value="ENTRADA">ENTRADA (sumar existencias)</option>
      </select>
    </div>
    <div class="mb-3"><label class="form-label">Cantidad*</label><input type="number" min="1" class="form-control" name="cant" required></div>
    <div class="mb-3"><label class="form-label">Motivo*</label><input type="text" class="form-control" name="motivo" placeholder="Ej. Merma por vencimiento, Ajuste de conteo..." required></div>
  `, (form) => {
    const d = Object.fromEntries(new FormData(form));
    const r = registrarMovimiento(pid, d.tipo, parseInt(d.cant), d.motivo);
    if (!r.ok) return toast(r.error, 'danger');
    toast(`Ajuste registrado. Nuevo saldo: ${r.saldo}`);
    closeModal(); render(); abrirKardex(pid);
  }, 'Registrar ajuste');
}

/* ================== VISTA: CATEGORÍAS ================== */
function viewCategorias() {
  const rows = db.categorias.map(c => `
    <tr>
      <td>${c.id}</td>
      <td><strong>${c.nombre}</strong></td>
      <td>${c.descripcion || '—'}</td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-primary" onclick="openCategoriaForm(${c.id})"><i class="bi bi-pencil-square"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminarCategoria(${c.id})"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`).join('');
  return `
    <div class="card shadow">
      <div class="card-header theme-red d-flex justify-content-between align-items-center">
        <h4 class="mb-0"><i class="bi bi-tags"></i> Categorías</h4>
        <button class="btn btn-light" onclick="openCategoriaForm()"><i class="bi bi-plus-circle"></i> Nueva</button>
      </div>
      <div class="card-body">
        <table class="table table-hover"><thead class="table-light"><tr><th>ID</th><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>`;
}
function openCategoriaForm(id) {
  const c = id ? db.categorias.find(x => x.id === id) : null;
  openModal(c ? `Editar Categoría #${id}` : 'Nueva Categoría', `
    <div class="mb-3"><label class="form-label">Nombre*</label><input class="form-control" name="nombre" value="${c ? c.nombre : ''}" required></div>
    <div class="mb-3"><label class="form-label">Descripción</label><textarea class="form-control" name="desc" rows="3">${c ? c.descripcion : ''}</textarea></div>
  `, (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (c) { c.nombre = d.nombre; c.descripcion = d.desc; toast('Categoría actualizada'); }
    else { db.categorias.push({ id: nextId(db.categorias), nombre: d.nombre, descripcion: d.desc }); toast('Categoría creada'); }
    saveDB(); closeModal(); render();
  });
}
function eliminarCategoria(id) {
  const enUso = db.productos.filter(p => p.categoria_id === id && p.activo).length;
  if (enUso > 0) return toast(`No se puede eliminar: ${enUso} producto(s) la usan`, 'danger');
  if (!confirm('¿Eliminar esta categoría?')) return;
  db.categorias = db.categorias.filter(c => c.id !== id); saveDB(); toast('Categoría eliminada'); render();
}

/* ================== VISTA: SUCURSALES ================== */
function viewSucursales() {
  const rows = db.sucursales.map(s => `
    <tr><td>${s.id}</td><td><strong>${s.nombre}</strong></td><td><span class="badge bg-info text-dark">${s.ciudad}</span></td><td>${s.direccion || '—'}</td>
    <td class="text-nowrap">
      <button class="btn btn-sm btn-outline-primary" onclick="openSucursalForm(${s.id})"><i class="bi bi-pencil-square"></i></button>
      <button class="btn btn-sm btn-outline-danger" onclick="eliminarSucursal(${s.id})"><i class="bi bi-trash"></i></button>
    </td></tr>`).join('');
  return `
    <div class="card shadow">
      <div class="card-header theme-red d-flex justify-content-between align-items-center">
        <h4 class="mb-0"><i class="bi bi-shop-window"></i> Locales</h4>
        <button class="btn btn-light" onclick="openSucursalForm()"><i class="bi bi-plus-circle"></i> Nuevo Local</button>
      </div>
      <div class="card-body">
        <table class="table table-hover"><thead class="table-light"><tr><th>ID</th><th>Nombre</th><th>Ciudad</th><th>Dirección</th><th>Acciones</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>`;
}
function openSucursalForm(id) {
  const s = id ? db.sucursales.find(x => x.id === id) : null;
  openModal(s ? `Editar Local #${id}` : 'Nuevo Local', `
    <div class="mb-3"><label class="form-label">Nombre*</label><input class="form-control" name="nombre" value="${s ? s.nombre : ''}" required></div>
    <div class="mb-3"><label class="form-label">Ciudad*</label><input class="form-control" name="ciudad" value="${s ? s.ciudad : ''}" required></div>
    <div class="mb-3"><label class="form-label">Dirección</label><input class="form-control" name="dir" value="${s ? s.direccion : ''}"></div>
  `, (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (s) { s.nombre = d.nombre; s.ciudad = d.ciudad; s.direccion = d.dir; toast('Local actualizado'); }
    else { db.sucursales.push({ id: nextId(db.sucursales), nombre: d.nombre, ciudad: d.ciudad, direccion: d.dir }); toast('Local creado'); }
    saveDB(); closeModal(); render();
  });
}
function eliminarSucursal(id) {
  const enUso = db.productos.filter(p => p.sucursal_id === id && p.activo).length;
  if (enUso > 0) return toast(`No se puede eliminar: ${enUso} producto(s) asignados`, 'danger');
  if (!confirm('¿Eliminar este local?')) return;
  db.sucursales = db.sucursales.filter(s => s.id !== id); saveDB(); toast('Local eliminado'); render();
}

/* ================== VISTA: PROVEEDORES ================== */
function viewProveedores() {
  const rows = db.proveedores.map(p => `
    <tr><td>${p.id}</td><td><strong>${p.nombre}</strong></td><td><code>${p.ruc}</code></td><td>${p.telefono || '—'}</td><td>${p.email || '—'}</td>
    <td class="text-nowrap">
      <button class="btn btn-sm btn-outline-primary" onclick="openProveedorForm(${p.id})"><i class="bi bi-pencil-square"></i></button>
      <button class="btn btn-sm btn-outline-danger" onclick="eliminarProveedor(${p.id})"><i class="bi bi-trash"></i></button>
    </td></tr>`).join('');
  return `
    <div class="card shadow">
      <div class="card-header theme-red d-flex justify-content-between align-items-center">
        <h4 class="mb-0"><i class="bi bi-person-badge"></i> Proveedores</h4>
        <button class="btn btn-light" onclick="openProveedorForm()"><i class="bi bi-plus-circle"></i> Nuevo</button>
      </div>
      <div class="card-body">
        <table class="table table-hover"><thead class="table-light"><tr><th>ID</th><th>Nombre</th><th>RUC</th><th>Teléfono</th><th>Correo electrónico</th><th>Acciones</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>`;
}
function openProveedorForm(id) {
  const p = id ? db.proveedores.find(x => x.id === id) : null;
  openModal(p ? `Editar Proveedor #${id}` : 'Nuevo Proveedor', `
    <div class="mb-3"><label class="form-label">Nombre*</label><input class="form-control" name="nombre" value="${p ? p.nombre : ''}" required></div>
    <div class="mb-3"><label class="form-label">RUC*</label><input class="form-control" name="ruc" value="${p ? p.ruc : ''}" required></div>
    <div class="mb-3"><label class="form-label">Teléfono</label><input class="form-control" name="tel" value="${p ? p.telefono : ''}"></div>
    <div class="mb-3"><label class="form-label">Correo electrónico</label><input type="email" class="form-control" name="email" value="${p ? p.email : ''}"></div>
    <div class="mb-3"><label class="form-label">Dirección</label><textarea class="form-control" name="dir" rows="2">${p ? p.direccion : ''}</textarea></div>
  `, (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (p) { p.nombre = d.nombre; p.ruc = d.ruc; p.telefono = d.tel; p.email = d.email; p.direccion = d.dir; toast('Proveedor actualizado'); }
    else { db.proveedores.push({ id: nextId(db.proveedores), nombre: d.nombre, ruc: d.ruc, telefono: d.tel, email: d.email, direccion: d.dir }); toast('Proveedor creado'); }
    saveDB(); closeModal(); render();
  });
}
function eliminarProveedor(id) {
  const enUso = db.productos.filter(p => p.proveedor_id === id && p.activo).length;
  if (enUso > 0) return toast(`No se puede eliminar: ${enUso} producto(s) asociados`, 'danger');
  if (!confirm('¿Eliminar este proveedor?')) return;
  db.proveedores = db.proveedores.filter(p => p.id !== id); saveDB(); toast('Proveedor eliminado'); render();
}

/* ================== VISTA: USUARIOS ================== */
function viewUsuarios() {
  if (!session.es_admin) return '<div class="alert alert-danger">Sin permisos</div>';
  const rows = db.usuarios.map(u => `
    <tr>
      <td>${u.id}</td>
      <td><strong>${u.username}</strong></td>
      <td>${u.nombre_completo}</td>
      <td>${u.sucursal_id ? sucName(u.sucursal_id) : 'Todas'}</td>
      <td>${u.es_admin ? '<span class="badge bg-danger">Administrador</span>' : '<span class="badge bg-primary">Vendedor</span>'}</td>
      <td>${fmtD(u.fecha_creacion)}</td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-primary" onclick="openUsuarioForm(${u.id})"><i class="bi bi-pencil-square"></i></button>
        ${u.id !== session.id ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${u.id})"><i class="bi bi-trash"></i></button>` : ''}
      </td>
    </tr>`).join('');
  return `
    <div class="card shadow">
      <div class="card-header theme-red d-flex justify-content-between align-items-center">
        <h4 class="mb-0"><i class="bi bi-people"></i> Usuarios</h4>
        <button class="btn btn-light" onclick="openUsuarioForm()"><i class="bi bi-person-plus"></i> Nuevo</button>
      </div>
      <div class="card-body">
        <table class="table table-hover"><thead class="table-light"><tr><th>ID</th><th>Usuario</th><th>Nombre</th><th>Sucursal</th><th>Rol</th><th>Creado</th><th>Acciones</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>`;
}
function openUsuarioForm(id) {
  const u = id ? db.usuarios.find(x => x.id === id) : null;
  const sucs = `<option value="">Todas</option>` + db.sucursales.map(s => `<option value="${s.id}" ${u && u.sucursal_id === s.id ? 'selected' : ''}>${s.nombre}</option>`).join('');
  openModal(u ? `Editar Usuario #${id}` : 'Nuevo Usuario', `
    <div class="row g-3">
      <div class="col-md-6"><label class="form-label">Usuario*</label><input class="form-control" name="username" value="${u ? u.username : ''}" ${u ? 'disabled' : 'required'}></div>
      <div class="col-md-6"><label class="form-label">${u ? 'Nueva contraseña (opcional)' : 'Contraseña*'}</label><input type="password" class="form-control" name="password" ${u ? '' : 'required'}></div>
      <div class="col-12"><label class="form-label">Nombre completo*</label><input class="form-control" name="nombre" value="${u ? u.nombre_completo : ''}" required></div>
      <div class="col-md-6"><label class="form-label">Sucursal</label><select class="form-select" name="sucursal">${sucs}</select></div>
      <div class="col-md-6 d-flex align-items-end"><div class="form-check"><input class="form-check-input" type="checkbox" name="admin" ${u && u.es_admin ? 'checked' : ''} id="chkAdmin"><label class="form-check-label" for="chkAdmin">Es Administrador</label></div></div>
    </div>
  `, (form) => {
    const d = Object.fromEntries(new FormData(form));
    const esAdmin = form.querySelector('[name=admin]').checked;
    if (u) {
      u.nombre_completo = d.nombre; u.sucursal_id = d.sucursal ? parseInt(d.sucursal) : null; u.es_admin = esAdmin;
      if (d.password) u.password = d.password;
      toast('Usuario actualizado');
    } else {
      db.usuarios.push({ id: nextId(db.usuarios), username: d.username, password: d.password, nombre_completo: d.nombre, sucursal_id: d.sucursal ? parseInt(d.sucursal) : null, es_admin: esAdmin, fecha_creacion: new Date().toISOString().slice(0,10) });
      toast('Usuario creado');
    }
    saveDB(); closeModal(); render();
  });
}
function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  db.usuarios = db.usuarios.filter(u => u.id !== id); saveDB(); toast('Usuario eliminado'); render();
}

/* ================== VISTA: DESPACHOS ================== */
function viewDespachos() {
  const rows = db.despachos.map(d => {
    const totalItems = db.despacho_detalle.filter(x => x.despacho_id === d.id).length;
    const color = d.estado === 'RECIBIDO' ? 'table-success' : (d.estado === 'CANCELADO' ? 'table-danger' : 'table-warning');
    return `
      <tr class="${color}">
        <td>${d.id}</td>
        <td>${fmtDT(d.fecha_creacion)}</td>
        <td>${provName(d.proveedor_id)}</td>
        <td>${sucName(d.sucursal_id)}</td>
        <td><span class="badge bg-primary rounded-pill">${totalItems}</span></td>
        <td><span class="badge ${d.estado==='RECIBIDO'?'bg-success':d.estado==='CANCELADO'?'bg-danger':'bg-warning text-dark'}">${d.estado}</span></td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-primary" onclick="verDespacho(${d.id})" title="Ver detalle"><i class="bi bi-eye"></i></button>
          ${d.estado === 'PENDIENTE' ? `
            <button class="btn btn-sm btn-outline-success" onclick="recibirDespacho(${d.id})" title="Recibir"><i class="bi bi-check2-circle"></i></button>
            <button class="btn btn-sm btn-outline-warning" onclick="editarDespacho(${d.id})" title="Editar"><i class="bi bi-pencil-square"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="cancelarDespacho(${d.id})" title="Cancelar"><i class="bi bi-x-circle"></i></button>
          ` : ''}
        </td>
      </tr>`;
  }).join('');
  return `
    <div class="card shadow">
      <div class="card-header theme-red d-flex justify-content-between align-items-center">
        <h4 class="mb-0"><i class="bi bi-truck"></i> Despachos</h4>
        <button class="btn btn-light" onclick="nuevoDespacho()"><i class="bi bi-plus-circle"></i> Nuevo Despacho</button>
      </div>
      <div class="card-body">
        <table class="table table-hover align-middle"><thead class="table-light"><tr>
          <th>ID</th><th>Fecha</th><th>Proveedor</th><th>Sucursal</th><th>Productos</th><th>Estado</th><th>Acciones</th>
        </tr></thead><tbody>${rows || '<tr><td colspan="7" class="text-center text-muted">No hay despachos</td></tr>'}</tbody></table>
      </div>
    </div>`;
}

function nuevoDespacho() {
  despachoEditId = null;
  despachoCart = [];
  currentView = 'despachos-form';
  render();
}

function editarDespacho(id) {
  const d = db.despachos.find(x => x.id === id);
  if (!d) return;
  despachoEditId = id;
  despachoCart = db.despacho_detalle.filter(x => x.despacho_id === id).map(x => ({
    producto_id: x.producto_id, cantidad: x.cantidad, precio_unitario: x.precio_unitario,
  }));
  currentView = 'despachos-form';
  render();
}

function viewDespachoForm() {
  const d = despachoEditId ? db.despachos.find(x => x.id === despachoEditId) : null;
  const provs = db.proveedores.map(p => `<option value="${p.id}" ${d && d.proveedor_id === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('');
  const sucs = db.sucursales.map(s => `<option value="${s.id}" ${d && d.sucursal_id === s.id ? 'selected' : ''}>${s.nombre}</option>`).join('');
  const prods = db.productos.filter(p => p.activo).map(p => `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} (existencias: ${p.stock})</option>`).join('');

  const cartRows = despachoCart.length === 0
    ? '<tr><td colspan="5" class="text-center text-muted">Sin productos</td></tr>'
    : despachoCart.map((it, i) => {
        const p = db.productos.find(x => x.id === it.producto_id);
        return `<tr>
          <td>${p ? p.nombre : '?'}</td>
          <td>${it.cantidad}</td>
          <td>${fmtMoney(it.precio_unitario)}</td>
          <td>${fmtMoney(it.cantidad * it.precio_unitario)}</td>
          <td><button class="btn btn-sm btn-danger" onclick="quitarItem(${i})"><i class="bi bi-trash"></i></button></td>
        </tr>`;
      }).join('');

  return `
    <div class="card shadow">
      <div class="card-header theme-red">
        <h4 class="mb-0"><i class="bi bi-truck"></i> ${d ? 'Editar Despacho #' + d.id : 'Nuevo Despacho'}</h4>
      </div>
      <div class="card-body">
        <div class="row g-3 mb-4">
          <div class="col-md-6"><label class="form-label">Proveedor*</label>
            <select id="desp-prov" class="form-select">${provs}</select></div>
          <div class="col-md-6"><label class="form-label">Sucursal destino*</label>
            <select id="desp-suc" class="form-select">${sucs}</select></div>
          <div class="col-12"><label class="form-label">Notas</label>
            <textarea id="desp-notas" class="form-control" rows="2">${d ? d.notas || '' : ''}</textarea></div>
        </div>

        <div class="card mb-3 bg-light">
          <div class="card-body">
            <h6>Agregar producto</h6>
            <div class="row g-2">
              <div class="col-md-5"><select id="prod-select" class="form-select" onchange="actualizarPrecioDesp()">${prods}</select></div>
              <div class="col-md-2"><input type="number" id="prod-cant" class="form-control" min="1" value="1" placeholder="Cant."></div>
              <div class="col-md-2"><input type="number" step="0.01" id="prod-precio" class="form-control" placeholder="Precio"></div>
              <div class="col-md-3"><button class="btn theme-red-btn w-100" onclick="agregarItem()"><i class="bi bi-plus"></i> Agregar</button></div>
            </div>
          </div>
        </div>

        <h6>Productos en el despacho</h6>
        <table class="table table-sm table-bordered">
          <thead class="table-light"><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th><th></th></tr></thead>
          <tbody>${cartRows}</tbody>
        </table>

        <div class="text-end">
          <button class="btn btn-secondary" onclick="cancelarFormDespacho()">Cancelar</button>
          <button class="btn theme-red-btn" onclick="guardarDespacho()">${d ? 'Guardar cambios' : 'Registrar despacho'}</button>
        </div>
      </div>
    </div>`;
}

function actualizarPrecioDesp() {
  const sel = document.getElementById('prod-select');
  const opt = sel.options[sel.selectedIndex];
  if (opt) document.getElementById('prod-precio').value = opt.dataset.precio;
}

function agregarItem() {
  const pid = parseInt(document.getElementById('prod-select').value);
  const cant = parseInt(document.getElementById('prod-cant').value);
  const precio = parseFloat(document.getElementById('prod-precio').value);
  if (!pid || !cant || cant <= 0 || !precio || precio <= 0) return toast('Complete todos los campos', 'warning');
  const existente = despachoCart.findIndex(x => x.producto_id === pid);
  if (existente >= 0) despachoCart[existente].cantidad += cant;
  else despachoCart.push({ producto_id: pid, cantidad: cant, precio_unitario: precio });
  render();
}

function quitarItem(i) { despachoCart.splice(i, 1); render(); }
function cancelarFormDespacho() { despachoCart = []; despachoEditId = null; currentView = 'despachos'; render(); }

function guardarDespacho() {
  const prov = parseInt(document.getElementById('desp-prov').value);
  const suc = parseInt(document.getElementById('desp-suc').value);
  const notas = document.getElementById('desp-notas').value;
  if (!prov || !suc) return toast('Seleccione proveedor y sucursal', 'warning');
  if (despachoCart.length === 0) return toast('Agregue al menos un producto', 'warning');

  if (despachoEditId) {
    const d = db.despachos.find(x => x.id === despachoEditId);
    d.proveedor_id = prov; d.sucursal_id = suc; d.notas = notas;
    db.despacho_detalle = db.despacho_detalle.filter(x => x.despacho_id !== d.id);
    despachoCart.forEach(it => db.despacho_detalle.push({ id: nextId(db.despacho_detalle), despacho_id: d.id, ...it }));
    toast('Despacho actualizado');
  } else {
    const nuevo = { id: nextId(db.despachos), proveedor_id: prov, sucursal_id: suc, fecha_creacion: new Date().toISOString(), fecha_recibido: null, estado: 'PENDIENTE', notas };
    db.despachos.push(nuevo);
    despachoCart.forEach(it => db.despacho_detalle.push({ id: nextId(db.despacho_detalle), despacho_id: nuevo.id, ...it }));
    toast('Despacho creado');
  }
  saveDB(); despachoCart = []; despachoEditId = null; currentView = 'despachos'; render();
}

function eliminarDespacho(id) {
  if (!confirm('¿Eliminar este despacho?')) return;
  db.despachos = db.despachos.filter(d => d.id !== id);
  db.despacho_detalle = db.despacho_detalle.filter(x => x.despacho_id !== id);
  saveDB(); toast('Despacho eliminado'); render();
}

function cancelarDespacho(id) {
  if (!confirm('¿Cancelar este despacho? No se modificarán las existencias.')) return;
  const d = db.despachos.find(x => x.id === id);
  if (d) { d.estado = 'CANCELADO'; saveDB(); toast('Despacho cancelado', 'warning'); render(); }
}

function recibirDespacho(id) {
  const d = db.despachos.find(x => x.id === id);
  if (!d || d.estado !== 'PENDIENTE') return toast('No se puede recibir', 'danger');
  if (!confirm(`¿Recibir despacho #${id}?\nSe sumarán las existencias y se registrarán movimientos en el Kardex.`)) return;

  const items = db.despacho_detalle.filter(x => x.despacho_id === id);
  let errores = 0;
  items.forEach(it => {
    const prod = db.productos.find(p => p.id === it.producto_id);
    if (!prod) { errores++; return; }
    // En la demostración sumamos directo al producto referenciado (simplificación)
    registrarMovimiento(prod.id, 'ENTRADA', it.cantidad, `RECEPCIÓN DESPACHO #${id}`);
  });

  d.estado = 'RECIBIDO';
  d.fecha_recibido = new Date().toISOString();
  saveDB();
  toast(`Despacho #${id} recibido. ${items.length} movimiento(s) en Kardex.`);
  render();
}

function verDespacho(id) {
  const d = db.despachos.find(x => x.id === id);
  const items = db.despacho_detalle.filter(x => x.despacho_id === id);
  const rows = items.map(it => {
    const p = db.productos.find(x => x.id === it.producto_id);
    return `<tr><td>${p ? p.nombre : '?'}</td><td>${p ? p.codigo_barras : '—'}</td><td>${it.cantidad}</td><td>${fmtMoney(it.precio_unitario)}</td><td>${fmtMoney(it.cantidad * it.precio_unitario)}</td></tr>`;
  }).join('');
  const total = items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);
  openModal(`Despacho #${d.id} — ${d.estado}`, `
    <p><strong>Proveedor:</strong> ${provName(d.proveedor_id)}</p>
    <p><strong>Sucursal:</strong> ${sucName(d.sucursal_id)}</p>
    <p><strong>Creado:</strong> ${fmtDT(d.fecha_creacion)}</p>
    ${d.fecha_recibido ? `<p><strong>Recibido:</strong> ${fmtDT(d.fecha_recibido)}</p>` : ''}
    ${d.notas ? `<p><strong>Notas:</strong> ${d.notas}</p>` : ''}
    <table class="table table-sm table-bordered"><thead class="table-light"><tr><th>Producto</th><th>Código</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="text-center text-muted">Sin elementos</td></tr>'}</tbody>
    <tfoot><tr><td colspan="4" class="text-end"><strong>Total:</strong></td><td><strong>${fmtMoney(total)}</strong></td></tr></tfoot></table>
  `, () => closeModal(), 'Cerrar', 'modal-lg');
}

/* ================== INICIALIZACIÓN ================== */
initDB();
session = loadSession();
render();
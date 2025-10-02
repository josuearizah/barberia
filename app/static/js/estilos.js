function abrir(id) { document.getElementById(id)?.classList.remove('hidden'); }
function cerrar(id) { document.getElementById(id)?.classList.add('hidden'); }

class FixedRatioCropper {
    constructor({ input, wrapper, stage, image, zoom, resetBtn, aspectRatio = 3 / 2, onActivate, onDeactivate }) {
        this.input = input;
        this.wrapper = wrapper;
        this.stage = stage;
        this.image = image;
        this.zoom = zoom;
        this.resetBtn = resetBtn;
        this.aspectRatio = aspectRatio;
        this.onActivate = typeof onActivate === 'function' ? onActivate : () => {};
        this.onDeactivate = typeof onDeactivate === 'function' ? onDeactivate : () => {};

        this.file = null;
        this.currentUrl = null;
        this.imageLoaded = false;
        this.dragging = false;
        this.state = {
            scale: 1,
            minScale: 1,
            maxScale: 3,
            offsetX: 0,
            offsetY: 0,
            containerWidth: 0,
            containerHeight: 0,
            naturalWidth: 0,
            naturalHeight: 0
        };

        this.onFileChange = this.onFileChange.bind(this);
        this.onZoomInput = this.onZoomInput.bind(this);
        this.onReset = this.onReset.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerCancel = this.onPointerCancel.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onResize = this.onResize.bind(this);

        this.init();
    }

    init() {
        if (!this.input || !this.wrapper || !this.stage || !this.image || !this.zoom) return;

        this.image.style.transformOrigin = 'top left';
        this.stage.classList.add('relative');
        this.wrapper.classList.add('hidden');
        this.zoom.disabled = true;

        this.input.addEventListener('change', this.onFileChange);
        this.zoom.addEventListener('input', this.onZoomInput);
        this.resetBtn?.addEventListener('click', this.onReset);

        this.stage.addEventListener('pointerdown', this.onPointerDown);
        this.stage.addEventListener('pointermove', this.onPointerMove);
        this.stage.addEventListener('pointerup', this.onPointerUp);
        this.stage.addEventListener('pointercancel', this.onPointerCancel);
        this.stage.addEventListener('wheel', this.onWheel, { passive: false });

        window.addEventListener('resize', this.onResize);
    }

    hasImage() {
        return this.imageLoaded && !!this.file;
    }

    clear(resetInput = false) {
        if (resetInput && this.input) {
            this.input.value = '';
        }
        if (this.currentUrl) {
            URL.revokeObjectURL(this.currentUrl);
            this.currentUrl = null;
        }
        this.file = null;
        this.imageLoaded = false;
        this.wrapper?.classList.add('hidden');
        this.zoom.disabled = true;
        this.zoom.value = '1';
        this.state.scale = 1;
        this.state.offsetX = 0;
        this.state.offsetY = 0;
        this.state.containerWidth = 0;
        this.state.containerHeight = 0;
        this.stage?.classList.remove('cursor-grab', 'cursor-grabbing');
        if (this.image) {
            this.image.style.transform = 'translate(0px, 0px) scale(1)';
            this.image.removeAttribute('src');
        }
        this.onDeactivate();
    }

    onFileChange(event) {
        const [file] = event.target.files || [];
        if (!file) {
            this.clear(false);
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert('Selecciona un archivo de imagen válido.');
            this.clear(true);
            return;
        }
        this.loadFile(file);
    }

    loadFile(file) {
        this.clear(false);
        this.file = file;
        const objectUrl = URL.createObjectURL(file);
        this.currentUrl = objectUrl;
        this.wrapper.classList.remove('hidden');
        this.stage.classList.add('cursor-grab');
        this.zoom.disabled = true;
        this.imageLoaded = false;

        this.image.onload = () => {
            this.imageLoaded = true;
            this.state.naturalWidth = this.image.naturalWidth;
            this.state.naturalHeight = this.image.naturalHeight;
            this.onActivate();
            requestAnimationFrame(() => this.initPlacement());
        };
        this.image.onerror = () => {
            alert('No se pudo cargar la imagen seleccionada.');
            this.clear(true);
        };
        this.image.src = objectUrl;
    }

    initPlacement(attempt = 0) {
        if (!this.imageLoaded) return;
        const cw = this.stage.clientWidth;
        const ch = this.stage.clientHeight;

        if ((!cw || !ch) && attempt < 10) {
            requestAnimationFrame(() => this.initPlacement(attempt + 1));
            return;
        }

        if (!cw || !ch) return;

        const { naturalWidth, naturalHeight } = this.state;
        const minScale = Math.max(cw / naturalWidth, ch / naturalHeight);

        this.state = {
            ...this.state,
            scale: minScale,
            minScale,
            maxScale: minScale * 4,
            offsetX: (cw - naturalWidth * minScale) / 2,
            offsetY: (ch - naturalHeight * minScale) / 2,
            containerWidth: cw,
            containerHeight: ch
        };

        this.applyTransform();
        this.updateZoomControl();
        this.zoom.disabled = false;
    }

    clampOffsets() {
        const { naturalWidth, naturalHeight, scale, containerWidth, containerHeight } = this.state;
        const scaledWidth = naturalWidth * scale;
        const scaledHeight = naturalHeight * scale;

        const minX = Math.min(0, containerWidth - scaledWidth);
        const minY = Math.min(0, containerHeight - scaledHeight);

        this.state.offsetX = Math.max(minX, Math.min(0, this.state.offsetX));
        this.state.offsetY = Math.max(minY, Math.min(0, this.state.offsetY));
    }

    applyTransform() {
        if (!this.imageLoaded) return;
        this.clampOffsets();
        const { offsetX, offsetY, scale } = this.state;
        this.image.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    updateZoomControl() {
        if (!this.zoom) return;
        const { scale, minScale, maxScale } = this.state;
        this.zoom.min = minScale.toFixed(3);
        this.zoom.max = maxScale.toFixed(3);
        this.zoom.value = scale.toFixed(3);
    }

    applyScale(nextScale, pivotX, pivotY) {
        if (!this.imageLoaded) return;
        const { minScale, maxScale, naturalWidth, naturalHeight, scale, offsetX, offsetY, containerWidth, containerHeight } = this.state;
        const clamped = Math.max(minScale, Math.min(maxScale, nextScale));
        const prevScale = scale;
        if (Math.abs(clamped - prevScale) < 1e-3) {
            this.updateZoomControl();
            return;
        }

        const pivotPx = typeof pivotX === 'number' ? pivotX : containerWidth / 2;
        const pivotPy = typeof pivotY === 'number' ? pivotY : containerHeight / 2;

        const prevWidth = naturalWidth * prevScale;
        const prevHeight = naturalHeight * prevScale;
        const relX = prevWidth ? (pivotPx - offsetX) / prevWidth : 0.5;
        const relY = prevHeight ? (pivotPy - offsetY) / prevHeight : 0.5;

        this.state.scale = clamped;
        const newWidth = naturalWidth * clamped;
        const newHeight = naturalHeight * clamped;

        this.state.offsetX = pivotPx - relX * newWidth;
        this.state.offsetY = pivotPy - relY * newHeight;

        this.applyTransform();
        this.updateZoomControl();
    }

    onZoomInput(event) {
        const value = parseFloat(event.target.value);
        if (Number.isFinite(value)) {
            this.applyScale(value);
        }
    }

    onReset() {
        if (!this.imageLoaded) return;
        this.initPlacement();
    }

    onPointerDown(event) {
        if (!this.imageLoaded) return;
        event.preventDefault();
        this.dragging = true;
        this.stage.setPointerCapture?.(event.pointerId);
        this.stage.classList.remove('cursor-grab');
        this.stage.classList.add('cursor-grabbing');
        this.dragStart = {
            x: event.clientX,
            y: event.clientY,
            offsetX: this.state.offsetX,
            offsetY: this.state.offsetY
        };
    }

    onPointerMove(event) {
        if (!this.dragging) return;
        event.preventDefault();
        const dx = event.clientX - this.dragStart.x;
        const dy = event.clientY - this.dragStart.y;
        this.state.offsetX = this.dragStart.offsetX + dx;
        this.state.offsetY = this.dragStart.offsetY + dy;
        this.applyTransform();
    }

    stopDragging() {
        if (!this.dragging) return;
        this.dragging = false;
        this.stage.classList.add('cursor-grab');
        this.stage.classList.remove('cursor-grabbing');
    }

    onPointerUp(event) {
        this.stopDragging();
        this.stage.releasePointerCapture?.(event.pointerId);
    }

    onPointerCancel(event) {
        this.stopDragging();
        this.stage.releasePointerCapture?.(event.pointerId);
    }

    onWheel(event) {
        if (!this.imageLoaded) return;
        event.preventDefault();
        const rect = this.stage.getBoundingClientRect();
        const pivotX = event.clientX - rect.left;
        const pivotY = event.clientY - rect.top;
        const factor = event.deltaY < 0 ? 1.08 : 0.92;
        this.applyScale(this.state.scale * factor, pivotX, pivotY);
    }

    onResize() {
        if (!this.imageLoaded) return;
        const cw = this.stage.clientWidth;
        const ch = this.stage.clientHeight;
        if (!cw || !ch) return;

        const { naturalWidth, naturalHeight } = this.state;
        const newMinScale = Math.max(cw / naturalWidth, ch / naturalHeight);

        this.state.containerWidth = cw;
        this.state.containerHeight = ch;
        this.state.minScale = newMinScale;
        this.state.maxScale = newMinScale * 4;

        const targetScale = Math.max(this.state.scale, newMinScale);
        this.applyScale(targetScale, cw / 2, ch / 2);
        this.updateZoomControl();
    }

    async applyToFormData(formData) {
        if (!this.hasImage()) return false;

        const blob = await this.getCroppedBlob();
        if (!blob) throw new Error('No se pudo generar la imagen recortada.');

        const baseName = (this.file?.name || 'estilo').replace(/\.[^/.]+$/, '');
        const finalFile = new File([blob], `${baseName}-3x2.jpg`, { type: 'image/jpeg' });
        const fieldName = this.input?.name || 'imagen';
        formData.set(fieldName, finalFile);
        return true;
    }

    async getCroppedBlob() {
        if (!this.hasImage()) return null;

        const { offsetX, offsetY, scale, containerWidth, containerHeight, naturalWidth, naturalHeight } = this.state;
        const cropX = -offsetX / scale;
        const cropY = -offsetY / scale;
        const cropWidth = containerWidth / scale;
        const cropHeight = containerHeight / scale;

        const maxCropX = Math.max(0, naturalWidth - cropWidth);
        const maxCropY = Math.max(0, naturalHeight - cropHeight);
        const safeX = Math.min(Math.max(0, cropX), maxCropX);
        const safeY = Math.min(Math.max(0, cropY), maxCropY);

        const canvasWidth = Math.max(1, Math.round(cropWidth));
        const canvasHeight = Math.max(1, Math.round(cropHeight));

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.image, safeX, safeY, cropWidth, cropHeight, 0, 0, canvasWidth, canvasHeight);

        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (!blob) {
                    reject(new Error('No se pudo exportar la imagen.'));
                } else {
                    resolve(blob);
                }
            }, 'image/jpeg', 0.9);
        });
    }
}

const cropperNuevo = new FixedRatioCropper({
    input: document.getElementById('add-imagen-input'),
    wrapper: document.getElementById('add-cropper'),
    stage: document.getElementById('add-cropper-stage'),
    image: document.getElementById('add-cropper-image'),
    zoom: document.getElementById('add-cropper-zoom'),
    resetBtn: document.getElementById('add-cropper-reset')
});

const cropperEditar = new FixedRatioCropper({
    input: document.getElementById('edit-imagen-input'),
    wrapper: document.getElementById('edit-cropper'),
    stage: document.getElementById('edit-cropper-stage'),
    image: document.getElementById('edit-cropper-image'),
    zoom: document.getElementById('edit-cropper-zoom'),
    resetBtn: document.getElementById('edit-cropper-reset'),
    onActivate: () => {
        const wrapper = document.getElementById('preview-imagen-actual');
        if (wrapper) wrapper.hidden = true;
    },
    onDeactivate: () => {
        const wrapper = document.getElementById('preview-imagen-actual');
        if (wrapper) {
            const img = document.getElementById('img-actual');
            wrapper.hidden = !(img && img.src);
        }
    }
});

async function cargarEstilos() {
    try {
        const response = await fetch('/api/estilos');
        const estilos = await response.json();
        const tbody = document.getElementById('tabla-estilos-body');
        tbody.innerHTML = '';
        if (!response.ok) {
            tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-400">Error al cargar estilos: ${estilos.error}</td></tr>`;
            return;
        }
        if (estilos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-400">No hay estilos registrados.</td></tr>';
            return;
        }
        estilos.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${e.id}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${e.nombre}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                    ${e.imagen_url ? `<img src="${e.imagen_url}" alt="${e.nombre}" class="h-12 w-12 object-contain rounded-md border border-gray-700">` : '<span class="text-gray-500 italic">Sin imagen</span>'}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200 capitalize">${e.categoria}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200 text-center">
                    <input type="checkbox" class="toggle-activo" data-id="${e.id}" ${e.activo ? 'checked' : ''}>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                    <div class="flex items-center gap-3 justify-center">
                        <button class="btn-editar-estilo text-blue-400 hover:text-blue-300" title="Editar" 
                                data-id="${e.id}" data-nombre="${e.nombre}" data-categoria="${e.categoria}" 
                                data-imagen="${e.imagen_url || ''}" data-activo="${e.activo}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 3.487l2.651 2.651a2.25 2.25 0 010 3.182L9.41 19.425l-4.682 1.02 1.02-4.682 10.103-10.105a2.25 2.25 0 013.182 0z"/>
                            </svg>
                        </button>
                        <button class="btn-eliminar-estilo text-red-400 hover:text-red-300" title="Eliminar" 
                                data-id="${e.id}" data-nombre="${e.nombre}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"/>
                            </svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Re-asignar eventos para botones de editar, eliminar y toggle
        document.querySelectorAll('.btn-editar-estilo').forEach(btn => {
            btn.addEventListener('click', () => {
                cropperEditar.clear(true);
                document.getElementById('edit-id').value = btn.dataset.id;
                document.getElementById('edit-nombre').value = btn.dataset.nombre || '';
                document.getElementById('edit-categoria').value = btn.dataset.categoria || '';
                document.getElementById('edit-activo').checked = btn.dataset.activo === 'true';
                const imgUrl = btn.dataset.imagen;
                const previewWrapper = document.getElementById('preview-imagen-actual');
                const imgEl = document.getElementById('img-actual');
                if (imgUrl) {
                    imgEl.src = imgUrl;
                    previewWrapper.hidden = false;
                } else {
                    imgEl.removeAttribute('src');
                    previewWrapper.hidden = true;
                }
                abrir('modal-editar-estilo');
            });
        });
        document.querySelectorAll('.btn-eliminar-estilo').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('eliminar-id').value = btn.dataset.id;
                document.getElementById('eliminar-nombre').textContent = btn.dataset.nombre;
                abrir('modal-eliminar-estilo');
            });
        });
        document.querySelectorAll('.toggle-activo').forEach(chk => {
            chk.addEventListener('change', async () => {
                const id = chk.dataset.id;
                const estado = chk.checked;
                chk.disabled = true;
                try {
                    const response = await fetch(`/api/estilos/${id}/activo`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ activo: estado })
                    });
                    if (response.ok) {
                        alert(`Estado actualizado: ${estado ? 'Activo' : 'Inactivo'}`);
                    } else {
                        chk.checked = !estado;
                        alert('Error al cambiar el estado');
                    }
                } catch (error) {
                    chk.checked = !estado;
                    alert('Error al conectar con el servidor: ' + error.message);
                } finally {
                    chk.disabled = false;
                }
            });
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-400">Error al conectar con el servidor: ${error.message}</td></tr>`;
    }
}

// Añadir estilo

document.getElementById('btn-abrir-modal-estilo')?.addEventListener('click', () => {
    cropperNuevo.clear(true);
    abrir('modal-estilo');
});
document.getElementById('cerrar-modal-estilo')?.addEventListener('click', () => {
    cropperNuevo.clear(true);
    cerrar('modal-estilo');
});
document.querySelectorAll('.btn-cerrar-add').forEach(b => b.addEventListener('click', () => {
    cropperNuevo.clear(true);
    cerrar('modal-estilo');
}));
document.getElementById('modal-estilo')?.addEventListener('click', e => {
    if (e.target.id === 'modal-estilo') {
        cropperNuevo.clear(true);
        cerrar('modal-estilo');
    }
});

document.getElementById('form-estilo-nuevo')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!cropperNuevo.hasImage()) {
        alert('Selecciona una imagen y ajústala al marco 3:2 antes de guardar.');
        return;
    }
    const formData = new FormData(e.target);
    if (!formData.get('activo')) formData.set('activo', 'off');
    try {
        await cropperNuevo.applyToFormData(formData);
        const response = await fetch('/api/estilos', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            alert('¡Estilo añadido correctamente!');
            cerrar('modal-estilo');
            e.target.reset();
            cropperNuevo.clear(true);
            cargarEstilos();
        } else {
            alert('Error al añadir el estilo: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Editar estilo
const modalEditar = document.getElementById('modal-editar-estilo');
document.querySelectorAll('.cerrar-modal-editar').forEach(b => b.addEventListener('click', () => {
    cropperEditar.clear(true);
    cerrar('modal-editar-estilo');
}));
modalEditar?.addEventListener('click', e => {
    if (e.target.id === 'modal-editar-estilo') {
        cropperEditar.clear(true);
        cerrar('modal-editar-estilo');
    }
});

document.getElementById('form-estilo-editar')?.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (!formData.get('activo')) formData.set('activo', 'off');
    try {
        if (cropperEditar.hasImage()) {
            await cropperEditar.applyToFormData(formData);
        } else {
            const maybeFile = formData.get('imagen');
            if (maybeFile instanceof File && maybeFile.size === 0) {
                formData.delete('imagen');
            }
        }
        const response = await fetch(`/api/estilos/${formData.get('id')}`, {
            method: 'PUT',
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            alert('¡Estilo actualizado correctamente!');
            cerrar('modal-editar-estilo');
            cropperEditar.clear(true);
            cargarEstilos();
        } else {
            alert('Error al actualizar el estilo: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Eliminar estilo
document.querySelectorAll('.cerrar-modal-eliminar').forEach(b => b.addEventListener('click', () => cerrar('modal-eliminar-estilo')));
document.getElementById('modal-eliminar-estilo')?.addEventListener('click', e => { if (e.target.id === 'modal-eliminar-estilo') cerrar('modal-eliminar-estilo'); });

document.getElementById('form-estilo-eliminar')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('eliminar-id').value;
    try {
        const response = await fetch(`/api/estilos/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (response.ok) {
            alert('¡Estilo eliminado correctamente!');
            cerrar('modal-eliminar-estilo');
            cargarEstilos();
        } else {
            alert('Error al eliminar el estilo: ' + result.error);
        }
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message);
    }
});

// Cargar estilos al iniciar la página
document.addEventListener('DOMContentLoaded', cargarEstilos);

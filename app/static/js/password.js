document.addEventListener('DOMContentLoaded', function() {
    // Referencias a los distintos pasos del formulario
    const paso1 = document.getElementById('paso-1');
    const paso2 = document.getElementById('paso-2');
    const paso3 = document.getElementById('paso-3');
    const paso4 = document.getElementById('paso-4');
    
    // Referencias a los formularios
    const formCorreo = document.getElementById('form-correo');
    const formVerificacion = document.getElementById('form-verificacion');
    const formNuevaContrasena = document.getElementById('form-nueva-contrasena');
    
    // Botones adicionales
    const btnRegresarPaso1 = document.getElementById('btn-regresar-paso1');
    const btnReenviar = document.getElementById('btn-reenviar');
    
    // Variables para almacenar datos entre pasos
    let emailUsuario = '';
    let tokenVerificacion = '';
    
    // Paso 1: Envío de correo con código
    formCorreo.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        if (!email) return;
        
        try {
            // Mostrar estado de carga
            const submitBtn = formCorreo.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            
            // Enviar solicitud al servidor
            const response = await fetch('/api/reset-password/solicitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            // Restaurar botón
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            if (response.ok) {
                // Guardar email para pasos siguientes
                emailUsuario = email;
                
                // Avanzar al siguiente paso
                paso1.classList.add('hidden');
                paso2.classList.remove('hidden');
                
                // Enfocar el primer input de verificación
                const verificationInputs = document.querySelectorAll('.verification-input');
                if (verificationInputs.length > 0) {
                    verificationInputs[0].focus();
                }
                
                // Configurar los inputs de verificación
                setupVerificationInputs();
            } else {
                // Mostrar mensaje de error
                mostrarError(data.error || 'Ha ocurrido un error. Por favor, inténtalo de nuevo.');
            }
        } catch (error) {
            mostrarError('Error de conexión. Por favor, inténtalo de nuevo más tarde.');
            console.error('Error:', error);
        }
    });
    
    // Configuración de los inputs de verificación
    function setupVerificationInputs() {
        const inputs = document.querySelectorAll('.verification-input');
        inputs.forEach((input, index) => {
            // Auto-avanzar al siguiente input
            input.addEventListener('input', function() {
                if (this.value.length === this.maxLength) {
                    const nextInput = inputs[index + 1];
                    if (nextInput) nextInput.focus();
                }
            });
            
            // Permitir borrado con retroceso y avanzar al anterior
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && this.value === '') {
                    const prevInput = inputs[index - 1];
                    if (prevInput) prevInput.focus();
                }
            });
        });
    }
    
    // Paso 2: Verificación de código
    formVerificacion.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Recoger el código de los inputs
        const inputs = document.querySelectorAll('.verification-input');
        let codigo = '';
        inputs.forEach(input => {
            codigo += input.value;
        });
        
        if (codigo.length !== 6) {
            mostrarError('Por favor, ingresa el código completo de 6 dígitos.');
            return;
        }
        
        try {
            // Mostrar estado de carga
            const submitBtn = formVerificacion.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            
            // Enviar solicitud al servidor
            const response = await fetch('/api/reset-password/verificar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailUsuario, codigo })
            });
            
            const data = await response.json();
            
            // Restaurar botón
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            if (response.ok) {
                // Guardar token para el cambio de contraseña
                tokenVerificacion = data.token;
                
                // Avanzar al siguiente paso
                paso2.classList.add('hidden');
                paso3.classList.remove('hidden');
                
                // Configurar validación de contraseña
                setupPasswordValidation();
            } else {
                // Mostrar mensaje de error
                mostrarError(data.error || 'Código inválido. Por favor, inténtalo de nuevo.');
            }
        } catch (error) {
            mostrarError('Error de conexión. Por favor, inténtalo de nuevo más tarde.');
            console.error('Error:', error);
        }
    });
    
    // Botón para regresar al paso 1
    btnRegresarPaso1.addEventListener('click', function() {
        paso2.classList.add('hidden');
        paso1.classList.remove('hidden');
    });
    
    // Botón para reenviar código
    btnReenviar.addEventListener('click', async function() {
        if (!emailUsuario) return;
        
        try {
            // Cambiar estado del botón
            const originalText = btnReenviar.textContent;
            btnReenviar.disabled = true;
            btnReenviar.textContent = 'Enviando...';
            
            // Reenviar código
            const response = await fetch('/api/reset-password/reenviar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailUsuario })
            });
            
            const data = await response.json();
            
            // Restaurar botón después de un tiempo
            setTimeout(() => {
                btnReenviar.disabled = false;
                btnReenviar.textContent = originalText;
            }, 3000);
            
            if (response.ok) {
                // Mostrar mensaje de éxito
                mostrarExito('Código reenviado. Por favor, revisa tu correo.');
            } else {
                // Mostrar mensaje de error
                mostrarError(data.error || 'No se pudo reenviar el código. Inténtalo de nuevo.');
            }
        } catch (error) {
            btnReenviar.disabled = false;
            btnReenviar.textContent = originalText;
            mostrarError('Error de conexión. Por favor, inténtalo de nuevo más tarde.');
            console.error('Error:', error);
        }
    });
    
    // Configuración de validación de contraseña
    function setupPasswordValidation() {
        const newPassword = document.getElementById('new-password');
        const confirmPassword = document.getElementById('confirm-password');
        const btnCambiar = document.getElementById('btn-cambiar-contrasena');
        
        // Elementos de validación
        const pwdMinLength = document.getElementById('pwd-min-length');
        const pwdMatch = document.getElementById('pwd-match');
        
        // Contenedor de reglas (oculto por defecto)
        const rulesContainer = document.getElementById('pwd-min-length')?.parentElement;
        if (rulesContainer) rulesContainer.classList.add('hidden');

        function showRules() { rulesContainer?.classList.remove('hidden'); }
        function maybeHideRules() {
            const a = (newPassword?.value || '').length;
            const b = (confirmPassword?.value || '').length;
            if (!a && !b) rulesContainer?.classList.add('hidden');
        }

        // Función para validar contraseña
        function validatePassword() {
            const password = newPassword.value;
            const confirmPwd = confirmPassword.value;
            
            // Validar longitud m�nima
            if (password.length >= 8) {
                pwdMinLength.classList.replace('text-gray-400', 'text-green-400');
            } else {
                pwdMinLength.classList.replace('text-green-400', 'text-gray-400');
            }

            // Validar coincidencia
            if (password && confirmPwd && password === confirmPwd) {
                pwdMatch.classList.replace('text-gray-400', 'text-green-400');
            } else {
                pwdMatch.classList.replace('text-green-400', 'text-gray-400');
            }
            
            // Habilitar/deshabilitar botón según validación
            btnCambiar.disabled = !(password.length >= 8 && password === confirmPwd);
            
            if (btnCambiar.disabled) {
                btnCambiar.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                btnCambiar.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
        
        // Eventos para validación en tiempo real
        newPassword.addEventListener('input', validatePassword);
        confirmPassword.addEventListener('input', validatePassword);

        // Mostrar/ocultar reglas según foco
        newPassword.addEventListener('focus', showRules);
        confirmPassword.addEventListener('focus', showRules);
        newPassword.addEventListener('blur', () => setTimeout(maybeHideRules, 0));
        confirmPassword.addEventListener('blur', () => setTimeout(maybeHideRules, 0));
        
        // Iniciar con el botón deshabilitado
        btnCambiar.disabled = true;
        btnCambiar.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    // Paso 3: Cambiar contraseña
    formNuevaContrasena.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword !== confirmPassword) {
            mostrarError('Las contraseñas no coinciden.');
            return;
        }
        
        try {
            // Mostrar estado de carga
            const submitBtn = document.getElementById('btn-cambiar-contrasena');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            
            // Enviar solicitud al servidor
            const response = await fetch('/api/reset-password/completar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: emailUsuario, 
                    token: tokenVerificacion,
                    password: newPassword 
                })
            });
            
            const data = await response.json();
            
            // Restaurar botón
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            if (response.ok) {
                // Avanzar al paso final
                paso3.classList.add('hidden');
                paso4.classList.remove('hidden');
            } else {
                // Mostrar mensaje de error
                mostrarError(data.error || 'No se pudo cambiar la contraseña. Por favor, inténtalo de nuevo.');
            }
        } catch (error) {
            mostrarError('Error de conexión. Por favor, inténtalo de nuevo más tarde.');
            console.error('Error:', error);
        }
    });
    
    // Funciones para mostrar mensajes
    function mostrarError(mensaje) {
        const alertsContainer = document.getElementById('alerts-container') || createAlertsContainer();
        
        const alertDiv = document.createElement('div');
        alertDiv.className = 'relative mb-4 px-4 py-3 rounded border border-red-500 text-red-400 bg-red-500/10 flex items-start justify-between gap-4';
        alertDiv.innerHTML = `
            <div class="font-medium">${mensaje}</div>
            <button type="button" class="text-xl leading-none text-inherit focus:outline-none"
                    onclick="this.parentElement.remove();">&times;</button>
        `;
        
        alertsContainer.appendChild(alertDiv);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
    
    function mostrarExito(mensaje) {
        const alertsContainer = document.getElementById('alerts-container') || createAlertsContainer();
        
        const alertDiv = document.createElement('div');
        alertDiv.className = 'relative mb-4 px-4 py-3 rounded border border-green-500 text-green-400 bg-green-500/10 flex items-start justify-between gap-4';
        alertDiv.innerHTML = `
            <div class="font-medium">${mensaje}</div>
            <button type="button" class="text-xl leading-none text-inherit focus:outline-none"
                    onclick="this.parentElement.remove();">&times;</button>
        `;
        
        alertsContainer.appendChild(alertDiv);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
    
    function createAlertsContainer() {
        const container = document.createElement('div');
        container.id = 'alerts-container';
        
        const parentElement = document.querySelector('.max-w-md');
        parentElement.insertBefore(container, parentElement.firstChild);
        
        return container;
    }
});

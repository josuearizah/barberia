document.addEventListener("DOMContentLoaded", () => {
  // Config redes (para render dinámico y abrir enlaces)
  const socialPlatforms = {
    instagram: { name: "Instagram", icon: "fab fa-instagram", color: "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600", baseUrl: "https://instagram.com/" },
    facebook: { name: "Facebook", icon: "fab fa-facebook", color: "bg-blue-600", baseUrl: "https://facebook.com/" },
    x: { name: "X", icon: "fa-brands fa-x-twitter", color: "bg-black text-white", baseUrl: "https://x.com/" },
    twitter: { name: "Twitter", icon: "fab fa-twitter", color: "bg-sky-500", baseUrl: "https://twitter.com/" },
    linkedin: { name: "LinkedIn", icon: "fab fa-linkedin", color: "bg-blue-700", baseUrl: "https://linkedin.com/in/" },
    youtube: { name: "YouTube", icon: "fab fa-youtube", color: "bg-red-600", baseUrl: "https://youtube.com/@" },
    tiktok: { name: "TikTok", icon: "fab fa-tiktok", color: "bg-black text-white", baseUrl: "https://tiktok.com/@" },
    whatsapp: { name: "WhatsApp", icon: "fab fa-whatsapp", color: "bg-green-500", baseUrl: "https://wa.me/" },
  };

  // Estado
  let userProfile = {
    nombre: "",
    apellido: "",
    telefono: "",
    descripcion: "",
    profileImage: null,
  };
  let userSocialNetworks = []; // [{id, platform, username}]
  let autoSaveTimeout = null;

  // Elementos comunes
  const profileAvatar = document.getElementById("profile-avatar");
  const nameEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");
  const phoneTextEl = document.getElementById("phone-text");
  const descriptionEl = document.getElementById("profile-description");
  const socialContainer = document.getElementById("social-networks");

  // Botones y modales: editar perfil
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const editProfileModal = document.getElementById("edit-profile-modal");
  const closeEditModal = document.getElementById("close-edit-modal");
  const cancelEdit = document.getElementById("cancel-edit");
  const editProfileForm = document.getElementById("edit-profile-form");

  // Añadir red social
  const addSocialBtn = document.getElementById("add-social-btn");
  const addSocialModal = document.getElementById("add-social-modal");
  const closeSocialModal = document.getElementById("close-social-modal");
  const cancelSocial = document.getElementById("cancel-social");
  const addSocialForm = document.getElementById("add-social-form");
  const socialDropdown = document.getElementById("social-dropdown");
  const selectedSocial = document.getElementById("selected-social");
  const socialOptions = document.getElementById("social-options");
  const socialPlatformInput = document.getElementById("social-platform");

  // Foto
  const changePhotoBtn = document.getElementById("change-photo-btn");
  const changePhotoModal = document.getElementById("change-photo-modal");
  const closePhotoModal = document.getElementById("close-photo-modal");
  const uploadPhotoBtn = document.getElementById("upload-photo-btn");
  const photoInput = document.getElementById("photo-input");
  const keepInitialsBtn = document.getElementById("keep-initials-btn");
  const removePhotoBtn = document.getElementById("remove-photo-btn");
  const removePhotoSection = document.getElementById("remove-photo-section");

  // Seguridad: eliminar cuenta
  const deleteBtn = document.getElementById("delete-account-btn");
  const deleteModal = document.getElementById("delete-account-modal");
  const deleteForm = document.getElementById("delete-account-form");
  const deletePasswordInput = document.getElementById("delete-password");
  const closeDeleteModal = document.getElementById("close-delete-modal");
  const cancelDelete = document.getElementById("cancel-delete");

  const confirmModal = document.getElementById("confirm-delete-modal");
  const closeConfirmModal = document.getElementById("close-confirm-modal");
  const cancelConfirmDelete = document.getElementById("cancel-confirm-delete");
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

  // Seguridad: cambiar contraseña
  const changePasswordBtn = document.getElementById("change-password-btn");
  const changePasswordModal = document.getElementById("change-password-modal");
  const closeChangePassword = document.getElementById("close-change-password");
  const cancelChangePassword = document.getElementById("cancel-change-password");
  const changePasswordForm = document.getElementById("change-password-form");
  const currentPasswordInput = document.getElementById("current-password");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");

  // Utilidades
  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.style.overflow = "auto";
  }
  function showNotification(message, type = "info") {
    const n = document.createElement("div");
    n.className =
      "fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transform translate-x-full transition-transform duration-300 " +
      (type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500");
    n.innerHTML = `<i class="fas fa-${
      type === "success" ? "check" : type === "error" ? "exclamation-triangle" : "info"
    } mr-2"></i>${message}`;
    document.body.appendChild(n);
    setTimeout(() => n.classList.remove("translate-x-full"), 50);
    setTimeout(() => {
      n.classList.add("translate-x-full");
      setTimeout(() => n.remove(), 300);
    }, 3000);
  }
  function initialsFromName(nombre, apellido) {
    const a = (nombre || "").trim();
    const b = (apellido || "").trim();
    return (a[0] || "").toUpperCase() + (b[0] || "").toUpperCase();
  }
  function updateAvatarUI(imageUrl = null) {
    if (!profileAvatar) return;
    if (imageUrl) {
      profileAvatar.style.backgroundImage = `url(${imageUrl})`;
      profileAvatar.style.backgroundSize = "cover";
      profileAvatar.style.backgroundPosition = "center";
      profileAvatar.textContent = "";
      removePhotoSection?.classList.remove("hidden");
    } else {
      profileAvatar.style.backgroundImage = "";
      profileAvatar.style.backgroundSize = "";
      profileAvatar.style.backgroundPosition = "";
      profileAvatar.textContent = initialsFromName(userProfile.nombre, userProfile.apellido);
      removePhotoSection?.classList.add("hidden");
    }
  }

  // Dropdown personalizado para redes
  function initCustomDropdown() {
    if (!(socialOptions && socialDropdown && selectedSocial && socialPlatformInput)) return;
    socialOptions.innerHTML = "";
    Object.entries(socialPlatforms).forEach(([key, p]) => {
      const option = document.createElement("div");
      option.className = "flex items-center gap-3 px-3 py-2 hover:bg-gray-100 cursor-pointer";
      option.innerHTML = `
        <div class="w-8 h-8 ${p.color} rounded flex items-center justify-center text-white">
          <i class="${p.icon} text-xl"></i>
        </div>
        <span>${p.name}</span>
      `;
      option.addEventListener("click", () => {
        socialPlatformInput.value = key;
        selectedSocial.innerHTML = `
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 ${p.color} rounded flex items-center justify-center text-white">
              <i class="${p.icon} text-lg"></i>
            </div>
            <span>${p.name}</span>
          </div>
        `;
        socialOptions.classList.add("hidden");
      });
      socialOptions.appendChild(option);
    });
    socialDropdown.addEventListener("click", () => {
      socialOptions.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
      if (!socialDropdown.contains(e.target)) socialOptions.classList.add("hidden");
    });
  }

  // Render de redes sociales (tras cambios)
  function renderSocialNetworks() {
    if (!socialContainer) return;
    socialContainer.innerHTML = "";
    if (!userSocialNetworks.length) {
      socialContainer.innerHTML = `
        <div class="col-span-full text-center py-8 text-gray-500">
          <i class="fas fa-share-alt text-4xl mb-4"></i>
          <p>No hay redes sociales agregadas</p>
          <p class="text-sm">Haz clic en "Añadir Red Social" para comenzar</p>
        </div>`;
      return;
    }
    userSocialNetworks.forEach((net) => {
      const p = socialPlatforms[net.platform] || { icon: "fas fa-link", color: "bg-gray-400", name: net.platform || "Red" };
      const card = document.createElement("div");
      card.className = "bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow";
      card.innerHTML = `
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div class="w-12 h-12 ${p.color} rounded-lg flex items-center justify-center text-white shrink-0">
            <i class="${p.icon} text-3xl"></i>
          </div>
          <div class="min-w-0">
            <h3 class="font-semibold text-gray-800 truncate">${p.name}</h3>
            <p class="text-sm text-gray-600 break-all whitespace-normal leading-snug">${net.username}</p>
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          <button class="text-blue-600 hover:text-blue-800 p-2" aria-label="Abrir">
            <i class="fas fa-external-link-alt"></i>
          </button>
          <button class="text-red-600 hover:text-red-800 p-2" aria-label="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      const [openBtn, delBtn] = card.querySelectorAll("button");
      openBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openSocialLink(net.platform, net.username);
      });
      delBtn.addEventListener("click", () => {
        removeSocialNetwork(String(net.id));
      });
      socialContainer.appendChild(card);
    });
  }

  // Guardado con debounce (cuando solo afecta perfil)
  function autoSavePerfil() {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      savePerfil().catch(() => {});
    }, 800);
  }

  // Llamadas al backend
  async function loadUserData() {
    try {
      const res = await fetch("/perfil/datos");
      const data = await res.json();
      if (!res.ok || !data.success) return;

      userProfile.nombre = data.usuario?.nombre || userProfile.nombre;
      userProfile.apellido = data.usuario?.apellido || userProfile.apellido;
      userProfile.telefono = data.usuario?.telefono || userProfile.telefono;
      userProfile.descripcion = data.perfil?.descripcion || userProfile.descripcion;
      userProfile.profileImage = data.perfil?.imagen || null;

      userSocialNetworks = Array.isArray(data.perfil?.redes_sociales) ? data.perfil.redes_sociales : [];

      if (nameEl) nameEl.textContent = `${userProfile.nombre || ""} ${userProfile.apellido || ""}`.trim();
      if (phoneTextEl) phoneTextEl.textContent = userProfile.telefono || "No especificado";
      if (descriptionEl) descriptionEl.textContent = userProfile.descripcion || "Descripción del perfil aquí...";
      updateAvatarUI(userProfile.profileImage);
      renderSocialNetworks();
    } catch (e) {
      console.warn("Error al cargar datos:", e);
    }
  }

  async function savePerfil() {
    const payload = {
      nombre: userProfile.nombre,
      apellido: userProfile.apellido,
      telefono: userProfile.telefono,
      descripcion: userProfile.descripcion,
      redes_sociales: userSocialNetworks,
    };
    const res = await fetch("/perfil/guardar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Error al guardar");
    }
    return data;
  }

  // ----------------- Validación de contraseña en tiempo real (solo visual) -----------------
  // NOTA: No bloquea el envío. Para ACTIVAR validación fuerte, descomenta el bloque indicado en handleChangePasswordSubmit
  const pwRules = {
    min8: { label: "Mínimo 8 caracteres", test: (v) => v.length >= 8 },
    number: { label: "Al menos 1 número", test: (v) => /\d/.test(v) },
    upper: { label: "Al menos 1 mayúscula", test: (v) => /[A-Z]/.test(v) },
  };
  let pwRulesEls = null;

  function ensurePasswordRulesUI() {
    if (!newPasswordInput) return;
    // Si ya existe, no lo dupliques
    if (pwRulesEls?.container && pwRulesEls.container.isConnected) return;

    const container = document.createElement("div");
    container.className = "mt-2 space-y-1 hidden"; // oculto por defecto

    // Lista de reglas
    const list = document.createElement("ul");
    list.className = "text-xs";
    const entries = {};
    Object.entries(pwRules).forEach(([key, rule]) => {
      const li = document.createElement("li");
      li.className = "flex items-center gap-2 text-gray-500";
      li.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
        <span>${rule.label}</span>
      `;
      entries[key] = li;
      list.appendChild(li);
    });

    container.appendChild(list);

    // Indicador de coincidencia con confirmar
    const matchMsg = document.createElement("div");
    matchMsg.className = "text-xs mt-1 text-gray-500";
    matchMsg.textContent = "Las contraseñas deben coincidir";
    container.appendChild(matchMsg);

    // Insertar después del campo de nueva contraseña
    const newPwWrapper = newPasswordInput.closest(".relative") || newPasswordInput.parentElement;
    newPwWrapper.insertAdjacentElement("afterend", container);

    pwRulesEls = { container, entries, matchMsg };
    updatePasswordRulesUI();
  }

  function updatePasswordRulesUI() {
    if (!pwRulesEls) return;
    const val = (newPasswordInput?.value || "");
    const confirmVal = (confirmPasswordInput?.value || "");

    // Reglas
    Object.entries(pwRules).forEach(([key, rule]) => {
      const ok = rule.test(val);
      const li = pwRulesEls.entries[key];
      const dot = li?.querySelector("span:nth-child(1)");
      if (!li || !dot) return;
      li.classList.toggle("text-gray-500", !ok);
      li.classList.toggle("text-green-600", ok);
      dot.classList.toggle("bg-gray-400", !ok);
      dot.classList.toggle("bg-green-500", ok);
    });

    // Coincidencia
    const matches = val.length > 0 && confirmVal.length > 0 && val === confirmVal;
    pwRulesEls.matchMsg.textContent = matches ? "Las contraseñas coinciden" : "Las contraseñas deben coincidir";
    pwRulesEls.matchMsg.classList.toggle("text-green-600", matches);
    pwRulesEls.matchMsg.classList.toggle("text-gray-500", !matches);
  }

  // Mostrar/ocultar reglas según foco
  function showPwRules() {
    ensurePasswordRulesUI();
    pwRulesEls?.container.classList.remove("hidden");
    updatePasswordRulesUI();
  }
  function hidePwRulesIfEmpty() {
    const a = (newPasswordInput?.value || "").length;
    const b = (confirmPasswordInput?.value || "").length;
    if (!a && !b) pwRulesEls?.container.classList.add("hidden");
  }

  // ----------------- Cambiar contraseña (sin bloquear por reglas visuales) -----------------
  function validateNewPasswordForSubmit(pw) {
    // NO se valida longitud mínima ahora (solo evitar vacío).
    return !!pw;
    // Para ACTIVAR más adelante:
    // return /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);
  }

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", () => {
      changePasswordForm?.reset();
      openModal(changePasswordModal);
      setTimeout(() => {
        ensurePasswordRulesUI();               // crear UI (oculta)
        pwRulesEls?.container.classList.add("hidden"); // mantener oculta al abrir
        // Quitar minlength del HTML (por si existe)
        newPasswordInput?.removeAttribute("minlength");
        confirmPasswordInput?.removeAttribute("minlength");
        currentPasswordInput?.focus();
        updatePasswordRulesUI();
      }, 50);
    });
  }
  closeChangePassword?.addEventListener("click", () => closeModal(changePasswordModal));
  cancelChangePassword?.addEventListener("click", () => closeModal(changePasswordModal));

  // Actualización en tiempo real
  newPasswordInput?.addEventListener("input", () => {
    ensurePasswordRulesUI();
    updatePasswordRulesUI();
  });
  confirmPasswordInput?.addEventListener("input", () => {
    ensurePasswordRulesUI();
    updatePasswordRulesUI();
  });

  // ...existing code...

  // Actualización en tiempo real
  newPasswordInput?.addEventListener("input", () => {
    ensurePasswordRulesUI();
    updatePasswordRulesUI();
  });
  confirmPasswordInput?.addEventListener("input", () => {
    ensurePasswordRulesUI();
    updatePasswordRulesUI();
  });

  // Elimina o comenta estos si existen (evitan ocultar las reglas):
  // currentPasswordInput?.addEventListener("focus", showPwRules);
  // newPasswordInput?.addEventListener("focus", showPwRules);
  // confirmPasswordInput?.addEventListener("focus", showPwRules);
  // newPasswordInput?.addEventListener("blur", hidePwRulesIfEmpty);
  // confirmPasswordInput?.addEventListener("blur", hidePwRulesIfEmpty);

  // Mostrar reglas SOLO con foco en "Nueva" o "Confirmar". Ocultar en cualquier otro foco dentro del modal.
  function isPwField(el) {
    return el === newPasswordInput || el === confirmPasswordInput;
  }

  changePasswordModal?.addEventListener("focusin", (e) => {
    if (isPwField(e.target)) showPwRules();
  });

  changePasswordModal?.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!isPwField(document.activeElement)) {
        pwRulesEls?.container?.classList.add("hidden");
      }
    }, 0);
  });

  // ...existing code...

  function handleChangePasswordSubmit(e) {
    e.preventDefault();
    const current = (currentPasswordInput?.value || "").trim();
    const next = (newPasswordInput?.value || "").trim();
    const confirm = (confirmPasswordInput?.value || "").trim();

    if (!current || !next || !confirm) {
      showNotification("Completa todos los campos", "error");
      return;
    }

    // NO bloquear por reglas ahora (solo visual). Para ACTIVAR más tarde, descomenta:
    // if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(next)) {
    //   showNotification("La contraseña debe tener mínimo 8 caracteres, 1 número y 1 mayúscula", "error");
    //   return;
    // }

    if (next !== confirm) {
      showNotification("Las contraseñas no coinciden", "error");
      return;
    }

    fetch("/perfil/cambiar-contrasena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: current,
        new_password: next,
        confirm_password: confirm,
      }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.success) {
          showNotification("Contraseña actualizada", "success");
          closeModal(changePasswordModal);
        } else {
          // No cerrar modal; no redirigir automáticamente
          showNotification(data.message || "No se pudo cambiar la contraseña", "error");
        }
      })
      .catch(() => showNotification("Error al cambiar la contraseña", "error"));
  }
  changePasswordForm?.addEventListener("submit", handleChangePasswordSubmit);

  // Eliminar cuenta
  deleteBtn?.addEventListener("click", () => {
    deleteForm?.reset();
    openModal(deleteModal);
    setTimeout(() => deletePasswordInput?.focus(), 50);
  });
  closeDeleteModal?.addEventListener("click", () => closeModal(deleteModal));
  cancelDelete?.addEventListener("click", () => closeModal(deleteModal));

  deleteForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = (deletePasswordInput?.value || "").trim();
    if (!password) {
      showNotification("Escribe tu contraseña", "error");
      return;
    }
    try {
      const res = await fetch("/perfil/verificar-contrasena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        openModal(confirmModal);
        closeModal(deleteModal);
      } else {
        showNotification(data.message || "Contraseña incorrecta", "error");
      }
    } catch (err) {
      showNotification("Error al verificar la contraseña", "error");
    }
  });

  closeConfirmModal?.addEventListener("click", () => closeModal(confirmModal));
  cancelConfirmDelete?.addEventListener("click", () => closeModal(confirmModal));
  confirmDeleteBtn?.addEventListener("click", async () => {
    try {
      const res = await fetch("/perfil/eliminar", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification("Cuenta eliminada", "success");
        setTimeout(() => {
          window.location.href = data.redirect || "/";
        }, 800);
      } else {
        showNotification(data.message || "No se pudo eliminar la cuenta", "error");
      }
    } catch (err) {
      showNotification("Error al eliminar la cuenta", "error");
    }
  });

  // Editar perfil
  editProfileBtn?.addEventListener("click", () => {
    document.getElementById("edit-name").value = userProfile.nombre || "";
    document.getElementById("edit-lastname").value = userProfile.apellido || "";
    document.getElementById("edit-phone").value = userProfile.telefono || "";
    document.getElementById("edit-description").value = userProfile.descripcion || "";
    openModal(editProfileModal);
  });
  closeEditModal?.addEventListener("click", () => closeModal(editProfileModal));
  cancelEdit?.addEventListener("click", () => closeModal(editProfileModal));

  editProfileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = (document.getElementById("edit-name")?.value || "").trim();
    const apellido = (document.getElementById("edit-lastname")?.value || "").trim();
    const telefono = (document.getElementById("edit-phone")?.value || "").trim();
    const descripcion = (document.getElementById("edit-description")?.value || "").trim();

    if (!nombre || !apellido) {
      showNotification("Nombre y apellido son obligatorios", "error");
      return;
    }

    userProfile = { ...userProfile, nombre, apellido, telefono, descripcion };

    try {
      await savePerfil();
      if (nameEl) nameEl.textContent = `${nombre} ${apellido}`;
      if (phoneTextEl) phoneTextEl.textContent = telefono || "No especificado";
      if (descriptionEl) descriptionEl.textContent = descripcion || "Descripción del perfil aquí...";
      updateAvatarUI(userProfile.profileImage);
      showNotification("Perfil actualizado", "success");
      closeModal(editProfileModal);
    } catch (e2) {
      showNotification("Error al guardar perfil", "error");
    }
  });

  // Foto de perfil
  changePhotoBtn?.addEventListener("click", () => openModal(changePhotoModal));
  closePhotoModal?.addEventListener("click", () => closeModal(changePhotoModal));
  keepInitialsBtn?.addEventListener("click", () => {
    userProfile.profileImage = null;
    updateAvatarUI(null);
    autoSavePerfil();
    showNotification("Se usarán las iniciales", "success");
    closeModal(changePhotoModal);
  });
  removePhotoBtn?.addEventListener("click", () => {
    if (!confirm("¿Eliminar foto de perfil?")) return;
    userProfile.profileImage = null;
    updateAvatarUI(null);
    autoSavePerfil();
    showNotification("Foto de perfil eliminada", "success");
    closeModal(changePhotoModal);
  });
  uploadPhotoBtn?.addEventListener("click", () => photoInput?.click());
  photoInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showNotification("Subiendo imagen...", "info");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/perfil/subir-imagen", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.success && data.image_url) {
        userProfile.profileImage = data.image_url;
        updateAvatarUI(data.image_url);
        autoSavePerfil();
        showNotification("Foto de perfil actualizada", "success");
        closeModal(changePhotoModal);
      } else {
        throw new Error(data.message || "Error al subir imagen");
      }
    } catch (err) {
      showNotification("Error al subir la imagen", "error");
    } finally {
      e.target.value = ""; // limpiar input
    }
  });

  // Añadir red social
  addSocialBtn?.addEventListener("click", () => openModal(addSocialModal));
  closeSocialModal?.addEventListener("click", () => closeModal(addSocialModal));
  cancelSocial?.addEventListener("click", () => closeModal(addSocialModal));

  addSocialForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const platform = socialPlatformInput?.value || "";
    const username = (document.getElementById("social-username")?.value || "").trim();
    if (!platform || !username) {
      showNotification("Completa plataforma y usuario/enlace", "error");
      return;
    }
    if (userSocialNetworks.some((n) => n.platform === platform)) {
      showNotification("Ya tienes esta red social agregada", "error");
      return;
    }
    const newNet = { id: String(Date.now()), platform, username };
    userSocialNetworks.push(newNet);
    try {
      await savePerfil();
      renderSocialNetworks();
      // Reset modal
      if (socialPlatformInput) socialPlatformInput.value = "";
      if (selectedSocial) selectedSocial.textContent = "Seleccionar red social";
      const un = document.getElementById("social-username");
      if (un) un.value = "";
      closeModal(addSocialModal);
      showNotification("Red social agregada", "success");
    } catch (err) {
      userSocialNetworks = userSocialNetworks.filter((n) => n.id !== newNet.id);
      showNotification("Error al guardar la red social", "error");
    }
  });

  // Exponer helpers usados en HTML
  window.openSocialLink = (platform, username) => {
    platform = (platform || "").toLowerCase();
    username = (username || "").trim();
    const base = socialPlatforms[platform]?.baseUrl || "";
    let url = "";
    if (/^https?:\/\//i.test(username)) url = username;
    else if (platform === "whatsapp") {
      const num = username.replace(/\D/g, "");
      if (num) url = (socialPlatforms.whatsapp.baseUrl || "") + num;
    } else if (base) {
      url = base + username.replace(/^@/, "");
    }
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  window.removeSocialNetwork = async (id) => {
    if (!confirm("¿Estás seguro de eliminar esta red social?")) return;
    const prev = [...userSocialNetworks];
    userSocialNetworks = userSocialNetworks.filter((n) => String(n.id) !== String(id));
    try {
      await savePerfil();
      renderSocialNetworks();
      showNotification("Red social eliminada", "success");
    } catch (err) {
      userSocialNetworks = prev;
      showNotification("Error al eliminar la red social", "error");
    }
  };

  // Toggle mostrar/ocultar contraseña (reutilizable)
  function setupPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((btn) => {
      const targetId = btn.getAttribute("aria-controls");
      const input = targetId ? document.getElementById(targetId) : btn.closest(".relative")?.querySelector("input[type='password'], input[type='text']");
      if (!input) return;
      btn.addEventListener("click", () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-pressed", show ? "true" : "false");
        const icon = btn.querySelector("i");
        if (icon) {
          icon.classList.toggle("fa-eye", !show);
          icon.classList.toggle("fa-eye-slash", show);
        }
      });
    });
  }

  // Cerrar modales al hacer click en el overlay
  [editProfileModal, addSocialModal, changePhotoModal, deleteModal, confirmModal, changePasswordModal]
    .filter(Boolean)
    .forEach((m) => {
      m.addEventListener("click", (e) => {
        if (e.target === m) closeModal(m);
      });
    });

    // Init
    initCustomDropdown();
    setupPasswordToggles();
    loadUserData();
});
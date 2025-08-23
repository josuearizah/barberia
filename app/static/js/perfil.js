document.addEventListener("DOMContentLoaded", () => {
  const socialPlatforms = {
    instagram: {
      name: "Instagram",
      icon: "fab fa-instagram",
      color: "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600",
      baseUrl: "https://instagram.com/",
    },
    facebook: {
      name: "Facebook",
      icon: "fab fa-facebook",
      color: "bg-blue-600",
      baseUrl: "https://facebook.com/",
    },
    x: {
      name: "X",
      icon: "fab fa-x-twitter",
      color: "bg-black text-white",
      baseUrl: "https://x.com/",
    },
    linkedin: {
      name: "LinkedIn",
      icon: "fab fa-linkedin",
      color: "bg-blue-700",
      baseUrl: "https://linkedin.com/in/",
    },
    youtube: {
      name: "YouTube",
      icon: "fab fa-youtube",
      color: "bg-red-600",
      baseUrl: "https://youtube.com/@",
    },
    tiktok: {
      name: "TikTok",
      icon: "fab fa-tiktok",
      color: "bg-black",
      baseUrl: "https://tiktok.com/@",
    },
    whatsapp: {
      name: "WhatsApp",
      icon: "fab fa-whatsapp",
      color: "bg-green-500",
      baseUrl: "https://wa.me/",
    },
  };

  let userProfile = {
    name: document.getElementById("profile-name")?.textContent.trim() || "",
    email: document.getElementById("profile-email")?.textContent.trim() || "",
    phone: document.getElementById("phone-text")?.textContent.trim() || "",
    description: "",
    profileImage: null,
  };

  let userSocialNetworks = [];
  let autoSaveTimeout = null;

  // Elementos del DOM
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const editProfileModal = document.getElementById("edit-profile-modal");
  const closeEditModal = document.getElementById("close-edit-modal");
  const cancelEdit = document.getElementById("cancel-edit");
  const editProfileForm = document.getElementById("edit-profile-form");

  const addSocialBtn = document.getElementById("add-social-btn");
  const addSocialModal = document.getElementById("add-social-modal");
  const closeSocialModal = document.getElementById("close-social-modal");
  const cancelSocial = document.getElementById("cancel-social");
  const addSocialForm = document.getElementById("add-social-form");

  const changePhotoBtn = document.getElementById("change-photo-btn");
  const changePhotoModal = document.getElementById("change-photo-modal");
  const closePhotoModal = document.getElementById("close-photo-modal");
  const uploadPhotoBtn = document.getElementById("upload-photo-btn");
  const photoInput = document.getElementById("photo-input");
  const keepInitialsBtn = document.getElementById("keep-initials-btn");
  const removePhotoBtn = document.getElementById("remove-photo-btn");
  const removePhotoSection = document.getElementById("remove-photo-section");

  const profileAvatar = document.getElementById("profile-avatar");
  const socialDropdown = document.getElementById("social-dropdown");
  const selectedSocial = document.getElementById("selected-social");
  const socialOptions = document.getElementById("social-options");
  const socialPlatformInput = document.getElementById("social-platform");

  function updateNavbarAvatar(imageUrl = null) {
    const navbarAvatars = document.querySelectorAll(".navbar-avatar");
    navbarAvatars.forEach((avatar) => {
      if (imageUrl) {
        avatar.style.backgroundImage = `url(${imageUrl})`;
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        avatar.textContent = "";
      } else {
        avatar.style.backgroundImage = "";
        avatar.style.backgroundSize = "";
        avatar.style.backgroundPosition = "";
        const nameParts = userProfile.name.split(" ");
        avatar.textContent = (nameParts[0]?.[0] || "").toUpperCase() + (nameParts[1]?.[0] || "").toUpperCase();
      }
    });
  }

  function autoSave() {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    autoSaveTimeout = setTimeout(() => {
      fetch("/perfil/guardar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: userProfile,
          socialNetworks: userSocialNetworks,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // showNotification("Guardado automáticamente", "success");
          }
        })
        .catch((error) => {
          console.error("Error al guardar:", error);
        });
    }, 1000);
  }

  function initCustomDropdown() {
    if (socialOptions && socialDropdown && selectedSocial && socialPlatformInput) {
      socialOptions.innerHTML = "";
      Object.entries(socialPlatforms).forEach(([key, platform]) => {
        const option = document.createElement("div");
        option.className = "flex items-center gap-3 px-3 py-2 hover:bg-gray-100 cursor-pointer";
        option.innerHTML = `
          <div class="w-8 h-8 ${platform.color} rounded flex items-center justify-center text-white">
            <i class="${platform.icon} text-xl"></i>
          </div>
          <span>${platform.name}</span>
        `;
        option.addEventListener("click", () => {
          socialPlatformInput.value = key;
          selectedSocial.innerHTML = `
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 ${platform.color} rounded flex items-center justify-center text-white">
                <i class="${platform.icon} text-sm"></i>
              </div>
              <span>${platform.name}</span>
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
        if (!socialDropdown.contains(e.target)) {
          socialOptions.classList.add("hidden");
        }
      });
    }
  }

  function openModal(modal) {
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal(modal) {
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
  }

  // Event listeners para modales
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      document.getElementById("edit-name").value = userProfile.name.split(" ")[0] || "";
      document.getElementById("edit-lastname").value = userProfile.name.split(" ").slice(1).join(" ") || "";
      document.getElementById("edit-phone").value = userProfile.phone === "No especificado" ? "" : userProfile.phone;
      document.getElementById("edit-description").value = userProfile.description || "";
      openModal(editProfileModal);
    });
  }
  if (closeEditModal) {
    closeEditModal.addEventListener("click", () => closeModal(editProfileModal));
  }
  if (cancelEdit) {
    cancelEdit.addEventListener("click", () => closeModal(editProfileModal));
  }

  if (addSocialBtn) {
    addSocialBtn.addEventListener("click", () => openModal(addSocialModal));
  }
  if (closeSocialModal) {
    closeSocialModal.addEventListener("click", () => closeModal(addSocialModal));
  }
  if (cancelSocial) {
    cancelSocial.addEventListener("click", () => closeModal(addSocialModal));
  }

  if (changePhotoBtn) {
    changePhotoBtn.addEventListener("click", () => openModal(changePhotoModal));
  }
  if (closePhotoModal) {
    closePhotoModal.addEventListener("click", () => closeModal(changePhotoModal));
  }
  if (keepInitialsBtn) {
    keepInitialsBtn.addEventListener("click", () => closeModal(changePhotoModal));
  }

  if (removePhotoBtn) {
    removePhotoBtn.addEventListener("click", () => {
      if (confirm("¿Estás seguro de que quieres eliminar tu foto de perfil?")) {
        if (profileAvatar) {
          profileAvatar.style.backgroundImage = "";
          profileAvatar.style.backgroundSize = "";
          profileAvatar.style.backgroundPosition = "";
          const nameParts = userProfile.name.split(" ");
          profileAvatar.textContent = (nameParts[0]?.[0] || "").toUpperCase() + (nameParts[1]?.[0] || "").toUpperCase();
        }
        if (removePhotoSection) removePhotoSection.classList.add("hidden");
        userProfile.profileImage = null;
        updateNavbarAvatar();
        autoSave();
        showNotification("Foto de perfil eliminada", "success");
        closeModal(changePhotoModal);
      }
    });
  }

  if (editProfileModal && addSocialModal && changePhotoModal) {
    [editProfileModal, addSocialModal, changePhotoModal].forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    });
  }

  if (editProfileForm) {
    editProfileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("edit-name")?.value.trim() || "";
      const lastname = document.getElementById("edit-lastname")?.value.trim() || "";
      const phone = document.getElementById("edit-phone")?.value.trim() || "";
      const description = document.getElementById("edit-description")?.value.trim() || "";

      if (name && lastname) {
        userProfile.name = `${name} ${lastname}`;
        userProfile.phone = phone;
        userProfile.description = description;

        if (document.getElementById("profile-name")) {
          document.getElementById("profile-name").textContent = userProfile.name;
        }
        if (document.getElementById("phone-text")) {
          document.getElementById("phone-text").textContent = phone || "No especificado";
        }
        if (document.getElementById("profile-description")) {
          document.getElementById("profile-description").textContent = description || "Descripción del perfil aquí...";
        }

        if (!userProfile.profileImage && profileAvatar) {
          const nameParts = userProfile.name.split(" ");
          profileAvatar.textContent = (nameParts[0]?.[0] || "").toUpperCase() + (nameParts[1]?.[0] || "").toUpperCase();
          updateNavbarAvatar();
        }

        autoSave();
        showNotification("Perfil actualizado correctamente", "success");
        closeModal(editProfileModal);
      } else {
        showNotification("Por favor completa todos los campos obligatorios", "error");
      }
    });
  }

  if (addSocialForm) {
    addSocialForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const platform = socialPlatformInput?.value || "";
      const username = document.getElementById("social-username")?.value.trim() || "";

      if (platform && username) {
        const existingNetwork = userSocialNetworks.find((network) => network.platform === platform);
        if (existingNetwork) {
          showNotification("Ya tienes esta red social agregada", "error");
          return;
        }

        const socialNetwork = {
          platform: platform,
          username: username,
          id: userSocialNetworks.length, // Usar índice para mantener consistencia con el servidor
        };

        userSocialNetworks.push(socialNetwork);
        renderSocialNetworks();

        if (socialPlatformInput) socialPlatformInput.value = "";
        if (selectedSocial) selectedSocial.textContent = "Seleccionar red social";
        if (document.getElementById("social-username")) document.getElementById("social-username").value = "";

        autoSave();
        showNotification("Red social agregada correctamente", "success");
        closeModal(addSocialModal);
      } else {
        showNotification("Por favor completa todos los campos", "error");
      }
    });
  }

  if (uploadPhotoBtn) {
    uploadPhotoBtn.addEventListener("click", () => {
      if (photoInput) photoInput.click();
    });
  }

  if (photoInput) {
    photoInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          showNotification("Subiendo imagen...", "info");
          const formData = new FormData();
          formData.append("file", file);
          const response = await fetch("/perfil/subir-imagen", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (data.success && data.image_url) {
            if (profileAvatar) {
              profileAvatar.style.backgroundImage = `url(${data.image_url})`;
              profileAvatar.style.backgroundSize = "cover";
              profileAvatar.style.backgroundPosition = "center";
              profileAvatar.textContent = "";
            }
            if (removePhotoSection) removePhotoSection.classList.remove("hidden");
            userProfile.profileImage = data.image_url;
            updateNavbarAvatar(data.image_url);
            autoSave();
            showNotification("Foto de perfil actualizada", "success");
            closeModal(changePhotoModal);
          } else {
            throw new Error(data.message || "Error al subir imagen");
          }
        } catch (error) {
          console.error("Error:", error);
          showNotification("Error al subir la imagen", "error");
        }
      }
    });
  }

  function renderSocialNetworks() {
    // Recargar datos del servidor para actualizar la UI
    loadUserData();
  }

  window.openSocialLink = (platform, username) => {
    const platformData = socialPlatforms[platform] || { baseUrl: "" };
    let url = platformData.baseUrl ? platformData.baseUrl + username : username;

    if (username.startsWith("http") || username.startsWith("https")) {
      url = username;
    } else if (platform === "whatsapp" && !username.startsWith("+")) {
      url = platformData.baseUrl ? platformData.baseUrl + username.replace(/\D/g, "") : "";
    }

    if (url) {
      window.open(url, "_blank");
    } else {
      console.error("URL no válida para la red social:", platform, username);
    }
  };

  window.removeSocialNetwork = (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta red social?")) {
      const networkId = parseInt(id, 10); // Convertir ID a número
      userSocialNetworks = userSocialNetworks.filter((network) => network.id !== networkId);
      fetch("/perfil/guardar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: userProfile,
          socialNetworks: userSocialNetworks,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            renderSocialNetworks(); // Recarga los datos del servidor
            showNotification("Red social eliminada", "success");
          } else {
            showNotification("Error al eliminar la red social", "error");
          }
        })
        .catch((error) => {
          console.error("Error al eliminar:", error);
          showNotification("Error al eliminar la red social", "error");
        });
    }
  };

  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transform translate-x-full transition-transform duration-300 ${
      type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500"
    }`;
    notification.innerHTML = `<i class="fas fa-${type === "success" ? "check" : type === "error" ? "exclamation-triangle" : "info"} mr-2"></i>${message}`;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.remove("translate-x-full");
    }, 100);

    setTimeout(() => {
      notification.classList.add("translate-x-full");
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  function loadUserData() {
    fetch("/perfil/datos")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          userProfile = { ...userProfile, ...data.profile };
          userSocialNetworks = data.socialNetworks || [];

          if (data.profile.phone || data.profile.phone === "") {
            if (document.getElementById("phone-text")) {
              document.getElementById("phone-text").textContent = data.profile.phone || "No especificado";
            }
            userProfile.phone = data.profile.phone;
          }
          if (data.profile.description && document.getElementById("profile-description")) {
            document.getElementById("profile-description").textContent = data.profile.description;
          }
          if (data.profile.profileImage && profileAvatar) {
            profileAvatar.style.backgroundImage = `url(${data.profile.profileImage})`;
            profileAvatar.style.backgroundSize = "cover";
            profileAvatar.style.backgroundPosition = "center";
            profileAvatar.textContent = "";
            if (removePhotoSection) removePhotoSection.classList.remove("hidden");
            updateNavbarAvatar(data.profile.profileImage);
          } else if (profileAvatar) {
            const nameParts = userProfile.name.split(" ");
            profileAvatar.textContent = (nameParts[0]?.[0] || "").toUpperCase() + (nameParts[1]?.[0] || "").toUpperCase();
            profileAvatar.style.backgroundImage = "";
            profileAvatar.style.backgroundSize = "";
            profileAvatar.style.backgroundPosition = "";
            if (removePhotoSection) removePhotoSection.classList.add("hidden");
            updateNavbarAvatar();
          }
        }
      })
      .catch((error) => {
        console.error("Error al cargar datos:", error);
      });
  }

  initCustomDropdown();
  loadUserData();
});
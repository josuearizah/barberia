document.addEventListener("DOMContentLoaded", () => {
  const socialPlatforms = {
    instagram: {
      name: "Instagram",
      icon: "fab fa-instagram",
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
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
      color: "bg-black",
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
  }

  let userProfile = {
    name: document.getElementById("profile-name").textContent.trim(),
    email: document.getElementById("profile-email").textContent.trim(),
    phone: document.getElementById("phone-text").textContent.trim(),
    description: "",
    profileImage: null,
  }

  let userSocialNetworks = []
  let autoSaveTimeout = null

  // Elementos del DOM
  const editProfileBtn = document.getElementById("edit-profile-btn")
  const editProfileModal = document.getElementById("edit-profile-modal")
  const closeEditModal = document.getElementById("close-edit-modal")
  const cancelEdit = document.getElementById("cancel-edit")
  const editProfileForm = document.getElementById("edit-profile-form")

  const addSocialBtn = document.getElementById("add-social-btn")
  const addSocialModal = document.getElementById("add-social-modal")
  const closeSocialModal = document.getElementById("close-social-modal")
  const cancelSocial = document.getElementById("cancel-social")
  const addSocialForm = document.getElementById("add-social-form")

  const changePhotoBtn = document.getElementById("change-photo-btn")
  const changePhotoModal = document.getElementById("change-photo-modal")
  const closePhotoModal = document.getElementById("close-photo-modal")
  const uploadPhotoBtn = document.getElementById("upload-photo-btn")
  const photoInput = document.getElementById("photo-input")
  const keepInitialsBtn = document.getElementById("keep-initials-btn")
  const removePhotoBtn = document.getElementById("remove-photo-btn")
  const removePhotoSection = document.getElementById("remove-photo-section")

  const socialNetworksContainer = document.getElementById("social-networks")
  const profileAvatar = document.getElementById("profile-avatar")

  const socialDropdown = document.getElementById("social-dropdown")
  const selectedSocial = document.getElementById("selected-social")
  const socialOptions = document.getElementById("social-options")
  const socialPlatformInput = document.getElementById("social-platform")

  function updateNavbarAvatar(imageUrl = null) {
    const navbarAvatars = document.querySelectorAll(".navbar-avatar")
    navbarAvatars.forEach((avatar) => {
      if (imageUrl) {
        avatar.style.backgroundImage = `url(${imageUrl})`
        avatar.style.backgroundSize = "cover"
        avatar.style.backgroundPosition = "center"
        avatar.textContent = ""
      } else {
        avatar.style.backgroundImage = ""
        avatar.style.backgroundSize = ""
        avatar.style.backgroundPosition = ""
        const nameParts = userProfile.name.split(" ")
        avatar.textContent = (nameParts[0]?.[0] || "").toUpperCase() + (nameParts[1]?.[0] || "").toUpperCase()
      }
    })
  }

  function autoSave() {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
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
            // showNotification("Guardado automáticamente", "success") //
          }
        })
        .catch((error) => {
          console.error("Error al guardar:", error)
        })
    }, 1000)
  }

  function initCustomDropdown() {
    socialOptions.innerHTML = ""
    Object.entries(socialPlatforms).forEach(([key, platform]) => {
      const option = document.createElement("div")
      option.className = "flex items-center gap-3 px-3 py-2 hover:bg-gray-100 cursor-pointer"
      option.innerHTML = `
        <div class="w-8 h-8 ${platform.color} rounded flex items-center justify-center text-white">
          <i class="${platform.icon}"></i>
        </div>
        <span>${platform.name}</span>
      `
      option.addEventListener("click", () => {
        socialPlatformInput.value = key
        selectedSocial.innerHTML = `
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 ${platform.color} rounded flex items-center justify-center text-white">
              <i class="${platform.icon} text-sm"></i>
            </div>
            <span>${platform.name}</span>
          </div>
        `
        socialOptions.classList.add("hidden")
      })
      socialOptions.appendChild(option)
    })

    socialDropdown.addEventListener("click", () => {
      socialOptions.classList.toggle("hidden")
    })

    document.addEventListener("click", (e) => {
      if (!socialDropdown.contains(e.target)) {
        socialOptions.classList.add("hidden")
      }
    })
  }

  function openModal(modal) {
    modal.classList.remove("hidden")
    document.body.style.overflow = "hidden"
  }

  function closeModal(modal) {
    modal.classList.add("hidden")
    document.body.style.overflow = "auto"
  }

  // Event listeners para modales
  editProfileBtn.addEventListener("click", () => {
    document.getElementById("edit-name").value = userProfile.name.split(" ")[0] || ""
    document.getElementById("edit-lastname").value = userProfile.name.split(" ").slice(1).join(" ") || ""
    document.getElementById("edit-phone").value = userProfile.phone === "No especificado" ? "" : userProfile.phone
    document.getElementById("edit-description").value = userProfile.description || ""
    openModal(editProfileModal)
  })
  closeEditModal.addEventListener("click", () => closeModal(editProfileModal))
  cancelEdit.addEventListener("click", () => closeModal(editProfileModal))

  addSocialBtn.addEventListener("click", () => openModal(addSocialModal))
  closeSocialModal.addEventListener("click", () => closeModal(addSocialModal))
  cancelSocial.addEventListener("click", () => closeModal(addSocialModal))

  changePhotoBtn.addEventListener("click", () => openModal(changePhotoModal))
  closePhotoModal.addEventListener("click", () => closeModal(changePhotoModal))
  keepInitialsBtn.addEventListener("click", () => closeModal(changePhotoModal))

  removePhotoBtn.addEventListener("click", () => {
    if (confirm("¿Estás seguro de que quieres eliminar tu foto de perfil?")) {
      profileAvatar.style.backgroundImage = ""
      profileAvatar.style.backgroundSize = ""
      profileAvatar.style.backgroundPosition = ""
      const nameParts = userProfile.name.split(" ")
      profileAvatar.textContent = (nameParts[0]?.[0] || "").toUpperCase() + (nameParts[1]?.[0] || "").toUpperCase()
      removePhotoSection.classList.add("hidden")
      userProfile.profileImage = null
      updateNavbarAvatar()
      autoSave()
      showNotification("Foto de perfil eliminada", "success")
      closeModal(changePhotoModal)
    }
  })
  ;[editProfileModal, addSocialModal, changePhotoModal].forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal)
      }
    })
  })

  editProfileForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const name = document.getElementById("edit-name").value.trim()
    const lastname = document.getElementById("edit-lastname").value.trim()
    const phone = document.getElementById("edit-phone").value.trim()
    const description = document.getElementById("edit-description").value.trim()

    if (name && lastname) {
      userProfile.name = `${name} ${lastname}`
      userProfile.phone = phone
      userProfile.description = description

      document.getElementById("profile-name").textContent = userProfile.name
      document.getElementById("phone-text").textContent = phone || "No especificado"
      document.getElementById("profile-description").textContent = description || "Descripción del perfil aquí..."

      if (!userProfile.profileImage) {
        profileAvatar.textContent = name[0].toUpperCase() + lastname[0].toUpperCase()
        updateNavbarAvatar()
      }

      autoSave()
      showNotification("Perfil actualizado correctamente", "success")
      closeModal(editProfileModal)
    } else {
      showNotification("Por favor completa todos los campos obligatorios", "error")
    }
  })

  addSocialForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const platform = socialPlatformInput.value
    const username = document.getElementById("social-username").value.trim()

    if (platform && username) {
      const existingNetwork = userSocialNetworks.find((network) => network.platform === platform)
      if (existingNetwork) {
        showNotification("Ya tienes esta red social agregada", "error")
        return
      }

      const socialNetwork = {
        platform: platform,
        username: username,
        id: Date.now(),
      }

      userSocialNetworks.push(socialNetwork)
      renderSocialNetworks()

      socialPlatformInput.value = ""
      selectedSocial.textContent = "Seleccionar red social"
      document.getElementById("social-username").value = ""

      autoSave()
      showNotification("Red social agregada correctamente", "success")
      closeModal(addSocialModal)
    } else {
      showNotification("Por favor completa todos los campos", "error")
    }
  })

  uploadPhotoBtn.addEventListener("click", () => {
    photoInput.click()
  })

  photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0]
    if (file) {
        try {
        showNotification("Subiendo imagen...", "info")
        const formData = new FormData()
        formData.append("file", file)
        const response = await fetch("/perfil/subir-imagen", {
            method: "POST",
            body: formData,
        })
        const data = await response.json()
        if (data.success && data.image_url) {
            profileAvatar.style.backgroundImage = `url(${data.image_url})`
            profileAvatar.style.backgroundSize = "cover"
            profileAvatar.style.backgroundPosition = "center"
            profileAvatar.textContent = ""
            removePhotoSection.classList.remove("hidden")
            userProfile.profileImage = data.image_url
            updateNavbarAvatar(data.image_url)
            autoSave()
            showNotification("Foto de perfil actualizada", "success")
            closeModal(changePhotoModal)
        } else {
            throw new Error(data.message || "Error al subir imagen")
        }
        } catch (error) {
        console.error("Error:", error)
        showNotification("Error al subir la imagen", "error")
        }
    }
  })

  function renderSocialNetworks() {
    socialNetworksContainer.innerHTML = ""

    if (userSocialNetworks.length === 0) {
      socialNetworksContainer.innerHTML = `
        <div class="col-span-full text-center py-8 text-gray-500">
          <i class="fas fa-share-alt text-4xl mb-4"></i>
          <p>No tienes redes sociales agregadas</p>
          <p class="text-sm">Haz clic en "Añadir Red Social" para comenzar</p>
        </div>
      `
      return
    }

    userSocialNetworks.forEach((network) => {
      const platform = socialPlatforms[network.platform]
      const socialCard = document.createElement("div")
      socialCard.className =
        "bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"

      socialCard.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 ${platform.color} rounded-lg flex items-center justify-center text-white">
            <i class="${platform.icon} text-xl"></i>
          </div>
          <div>
            <h3 class="font-semibold text-gray-800">${platform.name}</h3>
            <p class="text-sm text-gray-600">${network.username}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="openSocialLink('${network.platform}', '${network.username}')" class="text-blue-600 hover:text-blue-800 p-2">
            <i class="fas fa-external-link-alt"></i>
          </button>
          <button onclick="removeSocialNetwork(${network.id})" class="text-red-600 hover:text-red-800 p-2">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `

      socialNetworksContainer.appendChild(socialCard)
    })
  }

  window.openSocialLink = (platform, username) => {
    const platformData = socialPlatforms[platform]
    let url = platformData.baseUrl + username

    if (username.startsWith("http")) {
      url = username
    } else if (platform === "whatsapp" && !username.startsWith("+")) {
      url = platformData.baseUrl + username.replace(/\D/g, "")
    }

    window.open(url, "_blank")
  }

  window.removeSocialNetwork = (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta red social?")) {
      userSocialNetworks = userSocialNetworks.filter((network) => network.id !== id)
      renderSocialNetworks()
      autoSave()
      showNotification("Red social eliminada", "success")
    }
  }

  function showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transform translate-x-full transition-transform duration-300 ${
      type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500"
    }`
    notification.innerHTML = `<i class="fas fa-${type === "success" ? "check" : type === "error" ? "exclamation-triangle" : "info"} mr-2"></i>${message}`

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.classList.remove("translate-x-full")
    }, 100)

    setTimeout(() => {
      notification.classList.add("translate-x-full")
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }

  function loadUserData() {
    fetch("/perfil/datos")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          userProfile = { ...userProfile, ...data.profile }
          userSocialNetworks = data.socialNetworks || []

          if (data.profile.phone || data.profile.phone === '') {
            document.getElementById("phone-text").textContent = data.profile.phone || "No especificado";
            userProfile.phone = data.profile.phone;
          }
          if (data.profile.description) {
            document.getElementById("profile-description").textContent = data.profile.description
          }
          if (data.profile.profileImage) {
            profileAvatar.style.backgroundImage = `url(${data.profile.profileImage})`
            profileAvatar.style.backgroundSize = "cover"
            profileAvatar.style.backgroundPosition = "center"
            profileAvatar.textContent = ""
            removePhotoSection.classList.remove("hidden")
            updateNavbarAvatar(data.profile.profileImage)
          }

          renderSocialNetworks()
        }
      })
      .catch((error) => {
        console.error("Error al cargar datos:", error)
      })
  }

  initCustomDropdown()
  loadUserData()
  renderSocialNetworks()
})

import { db, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc } from "./firebase-config.js"

// Check admin authentication
const adminUser = JSON.parse(localStorage.getItem("adminUser"))
if (!adminUser) {
  window.location.href = "admin-login.html"
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================
function loadAdminProfile() {
  const adminUser = JSON.parse(localStorage.getItem("adminUser"))
  if (adminUser) {
    // Set admin name
    const nameElement = document.getElementById("admin-name")
    if (nameElement) {
      nameElement.textContent = adminUser.name || "Admin User"
    }
    
    // Load profile picture from localStorage
    const savedProfilePic = localStorage.getItem("adminProfilePic")
    const profilePic = document.getElementById("admin-profile-pic")
    const profilePlaceholder = document.getElementById("admin-profile-placeholder")
    
    if (savedProfilePic && profilePic && profilePlaceholder) {
      profilePic.src = savedProfilePic
      profilePic.style.display = "block"
      profilePlaceholder.style.display = "none"
    }
  }
}

// Handle profile picture upload
const avatarInput = document.getElementById("admin-avatar-input")
if (avatarInput) {
  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showNotification("⚠️ Image size should be less than 2MB", "warning")
      e.target.value = ""
      return
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64Image = event.target.result
      
      // Save to localStorage
      localStorage.setItem("adminProfilePic", base64Image)
      
      // Update UI
      const profilePic = document.getElementById("admin-profile-pic")
      const profilePlaceholder = document.getElementById("admin-profile-placeholder")
      
      if (profilePic && profilePlaceholder) {
        profilePic.src = base64Image
        profilePic.style.display = "block"
        profilePlaceholder.style.display = "none"
      }
      
      showNotification("✅ Profile picture updated!", "success")
    }
    reader.readAsDataURL(file)
  })
}

// Logout function
const logoutBtn = document.getElementById("logout-btn")
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("adminUser")
    window.location.href = "admin-login.html"
  })
}

let currentProductId = null
let deleteProductId = null

// ============================================================================
// LOAD PRODUCTS
// ============================================================================
async function loadProducts() {
  try {
    const productsSnapshot = await getDocs(collection(db, "products"))
    const tbody = document.getElementById("products-tbody")

    if (productsSnapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #DEB887;">No products found</td></tr>'
      return
    }

    tbody.innerHTML = ""

    productsSnapshot.forEach((docSnapshot) => {
      const product = { id: docSnapshot.id, ...docSnapshot.data() }
      const imageCount = product.images ? product.images.length : 1
      
      const row = document.createElement("tr")
      row.innerHTML = `
        <td><img src="${product.image}" alt="${product.name}" class="product-image-thumb"></td>
        <td>${product.name}</td>
        <td>${product.category.toUpperCase()}</td>
        <td>₱${product.price.toFixed(2)}</td>
        <td><span class="image-count-badge">${imageCount} ${imageCount === 1 ? 'image' : 'images'}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-edit" data-id="${product.id}">Edit</button>
            <button class="btn-delete" data-id="${product.id}">Delete</button>
          </div>
        </td>
      `
      
      // Add event listeners to buttons
      row.querySelector(".btn-edit").addEventListener("click", () => editProduct(product.id))
      row.querySelector(".btn-delete").addEventListener("click", () => openDeleteModal(product.id))
      
      tbody.appendChild(row)
    })
  } catch (error) {
    console.error("Error loading products:", error)
    showNotification("Error loading products", "error")
  }
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================
function showNotification(message, type = "success") {
  const notification = document.createElement("div")
  notification.className = "success-notification"
  notification.textContent = message
  
  if (type === "error") {
    notification.style.background = "linear-gradient(135deg, #8B4513, #A0522D)"
  } else if (type === "warning") {
    notification.style.background = "linear-gradient(135deg, #ff9800, #f57c00)"
  }
  
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out"
    setTimeout(() => notification.remove(), 300)
  }, 3000)
}

// ============================================================================
// IMAGE MANAGEMENT
// ============================================================================
function addImageInput() {
  const container = document.getElementById("image-inputs")
  const inputGroups = container.querySelectorAll(".image-input-group")
  
  // Limit to 5 images
  if (inputGroups.length >= 5) {
    showNotification("Maximum 5 images allowed", "warning")
    return
  }
  
  const newGroup = document.createElement("div")
  newGroup.className = "image-input-group"
  
  const input = document.createElement("input")
  input.type = "file"
  input.className = "image-file-input"
  input.accept = "image/*"
  input.addEventListener("change", () => handleImageUpload(input))
  
  const removeBtn = document.createElement("button")
  removeBtn.type = "button"
  removeBtn.className = "btn-remove-image"
  removeBtn.textContent = "Remove"
  removeBtn.addEventListener("click", () => removeImageInput(removeBtn))
  
  newGroup.appendChild(input)
  newGroup.appendChild(removeBtn)
  container.appendChild(newGroup)
  
  updateImageCount()
  updateRemoveButtons()
}

function handleImageUpload(input) {
  const file = input.files[0]
  if (!file) return
  
  // Check file size (limit to 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showNotification("Image size should be less than 2MB", "warning")
    input.value = ""
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target.result
    input.dataset.base64 = base64
    updateImagePreviews()
  }
  reader.readAsDataURL(file)
}

function removeImageInput(button) {
  const container = document.getElementById("image-inputs")
  const inputGroups = container.querySelectorAll(".image-input-group")
  
  if (inputGroups.length > 1) {
    button.closest(".image-input-group").remove()
    updateImageCount()
    updateRemoveButtons()
    updateImagePreviews()
  }
}

function updateRemoveButtons() {
  const container = document.getElementById("image-inputs")
  const inputGroups = container.querySelectorAll(".image-input-group")
  const removeButtons = container.querySelectorAll(".btn-remove-image")
  
  removeButtons.forEach((btn) => {
    btn.style.display = inputGroups.length > 1 ? "block" : "none"
  })
}

function updateImageCount() {
  const container = document.getElementById("image-inputs")
  const inputGroups = container.querySelectorAll(".image-input-group")
  const badge = document.getElementById("image-count")
  
  const count = inputGroups.length
  badge.textContent = `${count} ${count === 1 ? 'image' : 'images'}`
}

function updateImagePreviews() {
  const inputs = document.querySelectorAll(".image-file-input")
  const previewContainer = document.getElementById("image-previews")
  
  previewContainer.innerHTML = ""
  
  inputs.forEach((input) => {
    if (input.dataset.base64) {
      const img = document.createElement("img")
      img.src = input.dataset.base64
      img.className = "image-preview"
      previewContainer.appendChild(img)
    }
  })
}

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================
function openAddProductModal() {
  currentProductId = null
  document.getElementById("modal-title").textContent = "➕ Add Product"
  document.getElementById("product-form").reset()
  document.getElementById("product-id").value = ""
  
  // Reset image inputs
  const container = document.getElementById("image-inputs")
  container.innerHTML = ""
  
  const group = document.createElement("div")
  group.className = "image-input-group"
  
  const input = document.createElement("input")
  input.type = "file"
  input.className = "image-file-input"
  input.accept = "image/*"
  input.required = true
  input.addEventListener("change", () => handleImageUpload(input))
  
  const removeBtn = document.createElement("button")
  removeBtn.type = "button"
  removeBtn.className = "btn-remove-image"
  removeBtn.textContent = "Remove"
  removeBtn.style.display = "none"
  removeBtn.addEventListener("click", () => removeImageInput(removeBtn))
  
  group.appendChild(input)
  group.appendChild(removeBtn)
  container.appendChild(group)
  
  updateImageCount()
  document.getElementById("image-previews").innerHTML = ""
  document.getElementById("product-modal").classList.add("active")
}

function closeProductModal() {
  document.getElementById("product-modal").classList.remove("active")
}

// ============================================================================
// EDIT PRODUCT
// ============================================================================
async function editProduct(productId) {
  try {
    const productDoc = await getDoc(doc(db, "products", productId))

    if (productDoc.exists()) {
      const product = productDoc.data()
      currentProductId = productId

      document.getElementById("modal-title").textContent = "✏️ Edit Product"
      document.getElementById("product-id").value = productId
      document.getElementById("product-name").value = product.name
      document.getElementById("product-category").value = product.category
      document.getElementById("product-price").value = product.price
      document.getElementById("product-description").value = product.description

      // Load existing images
      const container = document.getElementById("image-inputs")
      container.innerHTML = ""
      
      const images = product.images || [product.image]
      images.forEach((imageData, index) => {
        const group = document.createElement("div")
        group.className = "image-input-group"
        
        const input = document.createElement("input")
        input.type = "file"
        input.className = "image-file-input"
        input.accept = "image/*"
        if (index === 0) input.required = true
        input.dataset.base64 = imageData
        input.addEventListener("change", () => handleImageUpload(input))
        
        const removeBtn = document.createElement("button")
        removeBtn.type = "button"
        removeBtn.className = "btn-remove-image"
        removeBtn.textContent = "Remove"
        removeBtn.addEventListener("click", () => removeImageInput(removeBtn))
        if (index === 0 && images.length === 1) {
          removeBtn.style.display = "none"
        }
        
        group.appendChild(input)
        group.appendChild(removeBtn)
        container.appendChild(group)
      })
      
      updateImageCount()
      updateRemoveButtons()
      updateImagePreviews()

      document.getElementById("product-modal").classList.add("active")
    }
  } catch (error) {
    console.error("Error loading product:", error)
    showNotification("Error loading product", "error")
  }
}

// ============================================================================
// SAVE PRODUCT
// ============================================================================
const productForm = document.getElementById("product-form")
if (productForm) {
  productForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    // Collect all base64 images
    const imageInputs = document.querySelectorAll(".image-file-input")
    const images = []
    
    imageInputs.forEach((input) => {
      if (input.dataset.base64) {
        images.push(input.dataset.base64)
      }
    })
    
    if (images.length === 0) {
      showNotification("Please add at least one image", "warning")
      return
    }

    const productData = {
      name: document.getElementById("product-name").value,
      category: document.getElementById("product-category").value,
      price: parseFloat(document.getElementById("product-price").value),
      description: document.getElementById("product-description").value,
      image: images[0], // First image as main image
      images: images, // All images for gallery
      updatedAt: new Date().toISOString(),
    }

    try {
      if (currentProductId) {
        // Update existing product
        await updateDoc(doc(db, "products", currentProductId), productData)
        showNotification("Product updated successfully!")
      } else {
        // Add new product
        productData.createdAt = new Date().toISOString()
        await addDoc(collection(db, "products"), productData)
        showNotification("Product added successfully!")
      }

      closeProductModal()
      loadProducts()
    } catch (error) {
      console.error("Error saving product:", error)
      showNotification("Failed to save product", "error")
    }
  })
}

// ============================================================================
// DELETE PRODUCT
// ============================================================================
function openDeleteModal(productId) {
  deleteProductId = productId
  document.getElementById("delete-modal").classList.add("active")
}

function closeDeleteModal() {
  document.getElementById("delete-modal").classList.remove("active")
  deleteProductId = null
}

async function confirmDelete() {
  if (!deleteProductId) return

  try {
    await deleteDoc(doc(db, "products", deleteProductId))
    showNotification("Product deleted successfully!")
    closeDeleteModal()
    loadProducts()
  } catch (error) {
    console.error("Error deleting product:", error)
    showNotification("Failed to delete product", "error")
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
document.getElementById("open-add-product-modal").addEventListener("click", openAddProductModal)
document.getElementById("close-product-modal").addEventListener("click", closeProductModal)
document.getElementById("add-image-btn").addEventListener("click", addImageInput)
document.getElementById("close-delete-modal").addEventListener("click", closeDeleteModal)
document.getElementById("confirm-delete-btn").addEventListener("click", confirmDelete)
document.getElementById("cancel-delete-btn").addEventListener("click", closeDeleteModal)

// ============================================================================
// INITIALIZE
// ============================================================================
loadAdminProfile()
loadProducts()
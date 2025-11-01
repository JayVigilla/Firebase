import { renderBreadcrumb } from "./components.js"
import { 
  db, 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  auth,
  signOut
} from "./firebase-config.js"

// Render breadcrumb
const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer) {
  breadcrumbContainer.innerHTML = renderBreadcrumb([
    { label: "Home", link: "index.html" },
    { label: "Profile", link: null },
  ])
}

// Check if user is logged in
const user = JSON.parse(localStorage.getItem("currentUser"))
if (!user) {
  alert("Please login to view profile")
  window.location.href = "login.html"
}

// Tab navigation
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault()
    const tab = e.target.closest('.nav-item').dataset.tab

    document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"))
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"))

    e.target.closest('.nav-item').classList.add("active")
    document.getElementById(`${tab}-tab`).classList.add("active")

    if (tab === "orders") {
      loadOrderHistory()
    }
  })
})

// Profile Picture Upload
document.getElementById("avatar-upload").addEventListener("change", async (e) => {
  const file = e.target.files[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert('Image size must be less than 2MB')
    return
  }

  try {
    // Convert image to base64
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64Image = event.target.result

      // Update profile picture in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        profilePicture: base64Image,
        updatedAt: new Date().toISOString(),
      })

      // Update UI
      document.getElementById('profile-avatar').src = base64Image

      // Update localStorage
      const updatedUser = { ...user, profilePicture: base64Image }
      localStorage.setItem("currentUser", JSON.stringify(updatedUser))

      showNotification('Profile picture updated successfully!', 'success')
    }
    reader.readAsDataURL(file)
  } catch (error) {
    console.error("Error uploading profile picture:", error)
    showNotification('Failed to update profile picture', 'error')
  }
})

// Load user profile
async function loadProfile() {
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid))

    if (userDoc.exists()) {
      const userData = userDoc.data()
      
      // Update form fields
      document.getElementById("fullName").value = userData.fullName || ""
      document.getElementById("email").value = userData.email || ""
      document.getElementById("phone").value = userData.phone || ""
      document.getElementById("birthday").value = userData.birthday || ""

      // Update header info
      document.getElementById("header-name").textContent = userData.fullName || "User"
      document.getElementById("header-email").textContent = userData.email || ""

      // Update profile picture
      if (userData.profilePicture) {
        document.getElementById('profile-avatar').src = userData.profilePicture
      } else {
        // Use UI Avatars as fallback
        const name = userData.fullName || "User"
        document.getElementById('profile-avatar').src = 
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=150&background=ff69b4&color=fff`
      }

      // Update member since
      if (userData.createdAt) {
        const joinDate = new Date(userData.createdAt)
        document.getElementById("member-since").textContent = joinDate.getFullYear()
      }

      // Load statistics
      await loadStatistics()
    }
  } catch (error) {
    console.error("Error loading profile:", error)
    showNotification('Failed to load profile', 'error')
  }
}

// Load user statistics
async function loadStatistics() {
  try {
    const ordersRef = collection(db, "orders")
    const q = query(ordersRef, where("userId", "==", user.uid))
    const querySnapshot = await getDocs(q)

    let totalSpent = 0
    querySnapshot.forEach((doc) => {
      const order = doc.data()
      if (order.status !== 'cancelled') {
        totalSpent += order.total || 0
      }
    })

    document.getElementById("total-orders").textContent = querySnapshot.size
    document.getElementById("total-spent").textContent = `₱${totalSpent.toFixed(2)}`
  } catch (error) {
    console.error("Error loading statistics:", error)
  }
}

// Update profile
document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault()

  const fullName = document.getElementById("fullName").value.trim()
  const phone = document.getElementById("phone").value.trim()
  const birthday = document.getElementById("birthday").value

  if (!fullName) {
    showNotification('Please enter your full name', 'error')
    return
  }

  try {
    await updateDoc(doc(db, "users", user.uid), {
      fullName,
      phone,
      birthday,
      updatedAt: new Date().toISOString(),
    })

    // Update localStorage
    const updatedUser = { ...user, fullName, phone, birthday }
    localStorage.setItem("currentUser", JSON.stringify(updatedUser))

    // Update header
    document.getElementById("header-name").textContent = fullName

    showNotification('Profile updated successfully!', 'success')
  } catch (error) {
    console.error("Error updating profile:", error)
    showNotification('Failed to update profile', 'error')
  }
})

// Update password
document.getElementById("password-form").addEventListener("submit", async (e) => {
  e.preventDefault()

  const currentPassword = document.getElementById("current-password").value
  const newPassword = document.getElementById("new-password").value
  const confirmPassword = document.getElementById("confirm-password").value

  if (!currentPassword || !newPassword || !confirmPassword) {
    showNotification('Please fill in all password fields', 'error')
    return
  }

  if (newPassword.length < 6) {
    showNotification('New password must be at least 6 characters', 'error')
    return
  }

  if (newPassword !== confirmPassword) {
    showNotification('New passwords do not match', 'error')
    return
  }

  showNotification('Password change functionality requires additional Firebase setup', 'info')
  
  // Clear form
  document.getElementById("password-form").reset()
})

// Load order history
async function loadOrderHistory() {
  try {
    const ordersRef = collection(db, "orders")
    const q = query(ordersRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    const orderHistoryContainer = document.getElementById("order-history")

    if (querySnapshot.empty) {
      orderHistoryContainer.innerHTML = `
        <div class="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem;">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <p>No orders yet</p>
          <a href="shop.html" class="btn-primary" style="margin-top: 1rem;">Start Shopping</a>
        </div>
      `
      return
    }

    orderHistoryContainer.innerHTML = ""

    querySnapshot.forEach((doc) => {
      const order = { id: doc.id, ...doc.data() }
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'N/A'

      orderHistoryContainer.innerHTML += `
        <div class="order-item">
          <div class="order-header">
            <div>
              <strong>Order #${order.id.substring(0, 8).toUpperCase()}</strong>
              <p style="font-size: 14px; color: #666; margin-top: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                ${orderDate}
              </p>
            </div>
            <span class="order-status ${order.status}">${order.status.toUpperCase()}</span>
          </div>
          <p><strong>Total:</strong> ₱${(order.total || 0).toFixed(2)}</p>
          <p><strong>Items:</strong> ${order.items ? order.items.length : 0} item(s)</p>
          ${order.deliveryAddress ? `<p><strong>Delivery to:</strong> ${order.deliveryAddress}</p>` : ''}
        </div>
      `
    })
  } catch (error) {
    console.error("Error loading order history:", error)
    showNotification('Failed to load order history', 'error')
  }
}

// Logout functionality
document.getElementById("logout-btn").addEventListener("click", async () => {
  if (confirm("Are you sure you want to logout?")) {
    try {
      await signOut(auth)
      localStorage.removeItem("currentUser")
      localStorage.removeItem("cart")
      window.location.href = "index.html"
    } catch (error) {
      console.error("Error logging out:", error)
      showNotification('Failed to logout', 'error')
    }
  }
})

// Notification system
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existing = document.querySelector('.notification')
  if (existing) {
    existing.remove()
  }

  const notification = document.createElement('div')
  notification.className = `notification ${type}`
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  }

  const colors = {
    success: '#d1e7dd',
    error: '#f8d7da',
    info: '#cfe2ff'
  }

  const textColors = {
    success: '#0f5132',
    error: '#842029',
    info: '#084298'
  }

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type]};
    color: ${textColors[type]};
    padding: 16px 24px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
  `

  notification.innerHTML = `
    <span style="font-size: 20px; font-weight: bold;">${icons[type]}</span>
    <span>${message}</span>
  `

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease'
    setTimeout(() => notification.remove(), 300)
  }, 3000)
}

// Add animation styles
const style = document.createElement('style')
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`
document.head.appendChild(style)

// Initialize
loadProfile()
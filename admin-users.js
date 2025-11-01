import { db, collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from "./firebase-config.js"

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
    const nameElement = document.getElementById("admin-name")
    if (nameElement) {
      nameElement.textContent = adminUser.name || "Admin User"
    }
    
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
    
    if (file.size > 2 * 1024 * 1024) {
      showNotification("Image size should be less than 2MB", "warning")
      e.target.value = ""
      return
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64Image = event.target.result
      localStorage.setItem("adminProfilePic", base64Image)
      
      const profilePic = document.getElementById("admin-profile-pic")
      const profilePlaceholder = document.getElementById("admin-profile-placeholder")
      
      if (profilePic && profilePlaceholder) {
        profilePic.src = base64Image
        profilePic.style.display = "block"
        profilePlaceholder.style.display = "none"
      }
      
      showNotification("Profile picture updated!", "success")
    }
    reader.readAsDataURL(file)
  })
}

window.adminLogout = () => {
  localStorage.removeItem("adminUser")
  window.location.href = "admin-login.html"
}

let currentUserId = null
let currentAction = null

// ============================================================================
// LOAD ALL USERS
// ============================================================================
async function loadUsers() {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"))
    const tbody = document.getElementById("users-tbody")

    if (usersSnapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #DEB887;">No users found</td></tr>'
      return
    }

    tbody.innerHTML = ""

    usersSnapshot.forEach((docSnapshot) => {
      const user = { id: docSnapshot.id, ...docSnapshot.data() }
      const status = user.banned ? "Banned" : "Active"
      const statusClass = user.banned ? "cancelled" : "done"

      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${user.fullName || "N/A"}</td>
        <td>${user.email}</td>
        <td>${user.phone || "N/A"}</td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
        <td>
          <div class="action-buttons">
            ${
              !user.banned
                ? `<button class="btn-delete" data-user-id="${docSnapshot.id}" data-action="ban">Ban</button>`
                : `<button class="btn-primary" data-user-id="${docSnapshot.id}" data-action="unban" style="font-size: 12px;">Unban</button>`
            }
            <button class="btn-delete-user" data-user-id="${docSnapshot.id}" data-action="delete">Delete</button>
          </div>
        </td>
      `

      tbody.appendChild(row)
    })

    // Add event listeners to all buttons after they're added to DOM
    attachButtonListeners()
  } catch (error) {
    console.error("Error loading users:", error)
    showNotification("Failed to load users", "error")
  }
}

// ============================================================================
// ATTACH BUTTON LISTENERS
// ============================================================================
function attachButtonListeners() {
  // Ban buttons
  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const userId = e.target.getAttribute("data-user-id")
      const action = e.target.getAttribute("data-action")
      openUserActionModal(userId, action)
    })
  })

  // Unban buttons
  document.querySelectorAll(".btn-primary[data-action='unban']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const userId = e.target.getAttribute("data-user-id")
      const action = e.target.getAttribute("data-action")
      openUserActionModal(userId, action)
    })
  })

  // Delete buttons
  document.querySelectorAll(".btn-delete-user").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const userId = e.target.getAttribute("data-user-id")
      const action = e.target.getAttribute("data-action")
      openUserActionModal(userId, action)
    })
  })
}

// ============================================================================
// OPEN USER ACTION MODAL
// ============================================================================
function openUserActionModal(userId, action) {
  currentUserId = userId
  currentAction = action

  console.log(`Opening modal for user ${userId} with action ${action}`)

  const message = document.getElementById("delete-user-message")

  if (action === "ban") {
    message.textContent = "Are you sure you want to ban this user?"
  } else if (action === "unban") {
    message.textContent = "Are you sure you want to unban this user?"
  } else if (action === "delete") {
    message.textContent = "Are you sure you want to delete this user? This action cannot be undone."
  }

  document.getElementById("delete-user-modal").classList.add("active")
}

function closeDeleteUserModal() {
  document.getElementById("delete-user-modal").classList.remove("active")
  currentUserId = null
  currentAction = null
}

window.closeDeleteUserModal = closeDeleteUserModal

// ============================================================================
// CONFIRM USER ACTION
// ============================================================================
async function confirmUserAction() {
  if (!currentUserId || !currentAction) {
    console.error("No user ID or action specified")
    showNotification("Error: No user selected", "error")
    return
  }

  console.log(`Confirming action ${currentAction} for user ${currentUserId}`)

  try {
    // Verify document exists before attempting action
    const userDocRef = doc(db, "users", currentUserId)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      showNotification("User not found", "error")
      closeDeleteUserModal()
      loadUsers()
      return
    }

    if (currentAction === "delete") {
      await deleteDoc(userDocRef)
      showNotification("User deleted successfully!", "success")
    } else if (currentAction === "ban") {
      await updateDoc(userDocRef, {
        banned: true,
        updatedAt: new Date().toISOString(),
      })
      showNotification("User banned successfully!", "success")
    } else if (currentAction === "unban") {
      await updateDoc(userDocRef, {
        banned: false,
        updatedAt: new Date().toISOString(),
      })
      showNotification("User unbanned successfully!", "success")
    }

    closeDeleteUserModal()
    await loadUsers()
  } catch (error) {
    console.error("Error performing user action:", error)
    showNotification(`Failed to perform action: ${error.message}`, "error")
  }
}

window.confirmUserAction = confirmUserAction

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================
function showNotification(message, type = "success") {
  const notification = document.createElement("div")
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${
      type === "success" ? "linear-gradient(135deg, #4CAF50, #45a049)" :
      type === "error" ? "linear-gradient(135deg, #f44336, #d32f2f)" :
      type === "warning" ? "linear-gradient(135deg, #ff9800, #f57c00)" :
      "linear-gradient(135deg, #2196F3, #1976d2)"
    };
    color: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    font-weight: 600;
  `
  
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out"
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, 3000)
}

// ============================================================================
// STYLES
// ============================================================================
const style = document.createElement("style")
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }

  .btn-delete-user {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.3s;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    background: linear-gradient(135deg, #666, #444);
    color: white;
  }

  .btn-delete-user:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }
`
document.head.appendChild(style)

// ============================================================================
// INITIALIZE
// ============================================================================
console.log("🚀 Initializing Users Management...")

// Load profile
loadAdminProfile()

// Load users
loadUsers()

console.log("✅ Users Management Ready")
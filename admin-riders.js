import { db, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, onSnapshot, Timestamp, query, where, getDoc } from "./firebase-config.js"

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
      showNotification("Image size should be less than 2MB", 'warning')
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
      
      showNotification("Profile picture updated!", 'success')
    }
    reader.readAsDataURL(file)
  })
}

// Logout handler
const logoutBtn = document.getElementById("logout-btn")
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("adminUser")
      window.location.href = "admin-login.html"
    }
  })
}

let riderListeners = []

// ============================================================================
// SETUP REAL-TIME RIDERS
// ============================================================================
function setupRealtimeRiders() {
  riderListeners.forEach(unsubscribe => unsubscribe())
  riderListeners = []

  const unsubscribe = onSnapshot(collection(db, "riders"), 
    (snapshot) => {
      const riders = []
      snapshot.forEach((doc) => {
        riders.push({ id: doc.id, ...doc.data() })
      })
      
      riders.sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1
        if (a.status !== 'online' && b.status === 'online') return 1
        return (a.name || '').localeCompare(b.name || '')
      })
      
      displayRiders(riders)
      console.log(`Real-time riders update: ${riders.length} riders`)
    },
    (error) => {
      console.error("Error with real-time riders:", error)
      loadRiders()
    }
  )
  
  riderListeners.push(unsubscribe)
}

// ============================================================================
// LOAD RIDERS (FALLBACK)
// ============================================================================
async function loadRiders() {
  try {
    const ridersSnapshot = await getDocs(collection(db, "riders"))
    const riders = []

    ridersSnapshot.forEach((doc) => {
      riders.push({ id: doc.id, ...doc.data() })
    })
    
    displayRiders(riders)
  } catch (error) {
    console.error("Error loading riders:", error)
    showError("Failed to load riders. Please refresh the page.")
  }
}

// ============================================================================
// DISPLAY RIDERS
// ============================================================================
function displayRiders(riders) {
  const ridersGrid = document.getElementById("riders-grid")

  if (riders.length === 0) {
    ridersGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 30px; background: rgba(61, 40, 23, 0.6); border-radius: 20px;">
        <div style="font-size: 64px; margin-bottom: 20px;">🛵</div>
        <h3 style="color: #f5deb3; margin-bottom: 12px; font-size: 24px;">No Delivery Riders Yet</h3>
        <p style="color: #DEB887; margin-bottom: 24px;">Add your first delivery rider to get started!</p>
        <button class="btn-primary" onclick="openAddRiderModal()">
          ➕ Add First Rider
        </button>
      </div>
    `
    return
  }

  ridersGrid.innerHTML = riders.map(rider => createRiderCard(rider)).join('')
}

// ============================================================================
// CREATE RIDER CARD
// ============================================================================
function createRiderCard(rider) {
  const statusIcon = rider.status === "online" || rider.isOnline ? "🟢" : "🔴"
  const statusText = rider.status === "online" || rider.isOnline ? "Online" : "Offline"
  const statusClass = rider.status === "online" || rider.isOnline ? "online" : "offline"
  
  let lastActiveText = ''
  if (rider.lastActive) {
    const lastActive = rider.lastActive.toDate ? rider.lastActive.toDate() : new Date(rider.lastActive)
    const now = new Date()
    const diffMinutes = Math.floor((now - lastActive) / (1000 * 60))
    
    if (diffMinutes < 1) {
      lastActiveText = 'Active now'
    } else if (diffMinutes < 60) {
      lastActiveText = `Active ${diffMinutes}m ago`
    } else if (diffMinutes < 1440) {
      lastActiveText = `Active ${Math.floor(diffMinutes / 60)}h ago`
    } else {
      lastActiveText = lastActive.toLocaleDateString()
    }
  }

  const vehicleEmoji = {
    'motorcycle': '🏍️',
    'bicycle': '🚲',
    'car': '🚗'
  }[rider.vehicle] || '🚗'

  return `
    <div class="rider-card status-${statusClass}">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
        <div style="flex: 1;">
          <h3 style="margin: 0 0 8px 0; color: #f5deb3; font-size: 20px;">${rider.name}</h3>
          ${lastActiveText ? `<p style="font-size: 12px; color: #A0826D; margin: 0;">${lastActiveText}</p>` : ''}
        </div>
        <span style="font-size: 36px;" title="${statusText}">${statusIcon}</span>
      </div>
      
      <div style="margin-bottom: 16px; background: rgba(139, 115, 85, 0.2); padding: 16px; border-radius: 12px;">
        <p style="margin: 8px 0; color: #DEB887; display: flex; align-items: center; gap: 8px;">
          <strong>📱 Phone:</strong> <a href="tel:${rider.phone}" style="color: #F4A460; text-decoration: none;">${rider.phone}</a>
        </p>
        <p style="margin: 8px 0; color: #DEB887; display: flex; align-items: center; gap: 8px;">
          <strong>${vehicleEmoji} Vehicle:</strong> <span style="text-transform: capitalize;">${rider.vehicle}</span>
        </p>
        <p style="margin: 8px 0; color: #DEB887; display: flex; align-items: center; gap: 8px;">
          <strong>📊 Status:</strong> 
          <span class="status-badge ${statusClass}" style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${statusText}
          </span>
        </p>
      </div>
      
      ${rider.location ? `
        <div style="margin: 12px 0; padding: 12px; background: rgba(76, 175, 80, 0.15); border-radius: 8px; font-size: 13px; color: #DEB887; border-left: 3px solid #4CAF50;">
          <strong>📍 Last Location Update:</strong><br>
          ${new Date(rider.location.updatedAt.toDate()).toLocaleString()}
        </div>
      ` : ''}
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px;">
        <button 
          class="btn-toggle-status" 
          style="padding: 10px; background: ${statusClass === 'online' ? 'linear-gradient(135deg, #f44336, #d32f2f)' : 'linear-gradient(135deg, #4CAF50, #45a049)'}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.3s;"
          onclick="toggleRiderStatus('${rider.id}', '${rider.status || (rider.isOnline ? 'online' : 'offline')}')"
          onmouseover="this.style.transform='translateY(-2px)'"
          onmouseout="this.style.transform='translateY(0)'"
        >
          ${statusClass === 'online' ? '🔴 Set Offline' : '🟢 Set Online'}
        </button>
        <button 
          class="btn-view" 
          style="padding: 10px; background: linear-gradient(135deg, #2196F3, #1976D2); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.3s;"
          onclick="viewRiderDetails('${rider.id}')"
          onmouseover="this.style.transform='translateY(-2px)'"
          onmouseout="this.style.transform='translateY(0)'"
        >
          👁️ Details
        </button>
        <button 
          class="btn-edit" 
          style="padding: 10px; background: linear-gradient(135deg, #ff9800, #f57c00); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.3s;"
          onclick="editRider('${rider.id}')"
          onmouseover="this.style.transform='translateY(-2px)'"
          onmouseout="this.style.transform='translateY(0)'"
        >
          ✏️ Edit
        </button>
        <button 
          class="btn-delete" 
          style="padding: 10px; background: linear-gradient(135deg, #9e9e9e, #757575); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.3s;"
          onclick="deleteRider('${rider.id}', '${rider.name}')"
          onmouseover="this.style.transform='translateY(-2px)'"
          onmouseout="this.style.transform='translateY(0)'"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  `
}

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================
window.openAddRiderModal = () => {
  document.getElementById("add-rider-form").reset()
  document.getElementById("rider-add-modal").classList.add("active")
  document.getElementById("modal-title").textContent = "➕ Add Delivery Rider"
  document.getElementById("submit-btn").textContent = "✓ Add Rider"
  document.getElementById("rider-id").value = ""
}

window.closeAddRiderModal = () => {
  document.getElementById("rider-add-modal").classList.remove("active")
}

// Close modal button
const closeModalBtn = document.getElementById("close-add-rider-modal")
if (closeModalBtn) {
  closeModalBtn.addEventListener("click", window.closeAddRiderModal)
}

// Open modal button
const openModalBtn = document.getElementById("open-add-rider-modal")
if (openModalBtn) {
  openModalBtn.addEventListener("click", window.openAddRiderModal)
}

// Close modal when clicking outside
const modal = document.getElementById("rider-add-modal")
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      window.closeAddRiderModal()
    }
  })
}

// ============================================================================
// ADD/EDIT RIDER
// ============================================================================
const addRiderForm = document.getElementById("add-rider-form")
if (addRiderForm) {
  addRiderForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const riderId = document.getElementById("rider-id").value
    const riderData = {
      name: document.getElementById("rider-name").value.trim(),
      phone: document.getElementById("rider-phone").value.trim(),
      vehicle: document.getElementById("rider-vehicle").value,
      status: riderId ? undefined : "offline", // Don't change status on edit
      isOnline: riderId ? undefined : false,
      updatedAt: new Date().toISOString()
    }

    // Add createdAt only for new riders
    if (!riderId) {
      riderData.createdAt = new Date().toISOString()
      riderData.lastActive = Timestamp.now()
    }

    const submitBtn = e.target.querySelector('button[type="submit"]')
    const originalText = submitBtn.textContent
    submitBtn.disabled = true
    submitBtn.textContent = riderId ? 'Updating...' : 'Adding...'

    try {
      if (riderId) {
        // Update existing rider
        await updateDoc(doc(db, "riders", riderId), riderData)
        showNotification(`✅ Rider ${riderData.name} updated successfully!`, 'success')
      } else {
        // Add new rider
        const docRef = await addDoc(collection(db, "riders"), riderData)
        showNotification(`✅ Rider ${riderData.name} added successfully! ID: ${docRef.id.substring(0, 8)}`, 'success')
      }
      
      window.closeAddRiderModal()
    } catch (error) {
      console.error("Error saving rider:", error)
      showNotification(`❌ Failed to ${riderId ? 'update' : 'add'} rider. Please try again.`, 'error')
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = originalText
    }
  })
}

// ============================================================================
// EDIT RIDER
// ============================================================================
window.editRider = async (riderId) => {
  try {
    const riderDoc = await getDoc(doc(db, "riders", riderId))
    
    if (!riderDoc.exists()) {
      showNotification('❌ Rider not found', 'error')
      return
    }
    
    const rider = riderDoc.data()
    
    // Populate form
    document.getElementById("rider-id").value = riderId
    document.getElementById("rider-name").value = rider.name
    document.getElementById("rider-phone").value = rider.phone
    document.getElementById("rider-vehicle").value = rider.vehicle
    
    // Update modal title
    document.getElementById("modal-title").textContent = "✏️ Edit Delivery Rider"
    document.getElementById("submit-btn").textContent = "✓ Update Rider"
    
    // Open modal
    document.getElementById("rider-add-modal").classList.add("active")
  } catch (error) {
    console.error("Error loading rider for edit:", error)
    showNotification('❌ Failed to load rider details', 'error')
  }
}

// ============================================================================
// DELETE RIDER
// ============================================================================
window.deleteRider = async (riderId, riderName) => {
  if (!confirm(`⚠️ Are you sure you want to delete rider "${riderName}"?\n\nThis action cannot be undone.`)) {
    return
  }

  try {
    await deleteDoc(doc(db, "riders", riderId))
    showNotification(`✅ Rider ${riderName} deleted successfully!`, 'success')
  } catch (error) {
    console.error("Error deleting rider:", error)
    showNotification('❌ Failed to delete rider. Please try again.', 'error')
  }
}

// ============================================================================
// TOGGLE RIDER STATUS
// ============================================================================
window.toggleRiderStatus = async (riderId, currentStatus) => {
  const newStatus = currentStatus === "online" ? "offline" : "online"
  const isOnline = newStatus === "online"

  try {
    await updateDoc(doc(db, "riders", riderId), {
      status: newStatus,
      isOnline: isOnline,
      lastActive: Timestamp.now(),
      updatedAt: new Date().toISOString()
    })

    showNotification(`✅ Rider status updated to ${newStatus}`, 'success')
  } catch (error) {
    console.error("Error updating rider status:", error)
    showNotification('❌ Failed to update rider status', 'error')
  }
}

// ============================================================================
// VIEW RIDER DETAILS
// ============================================================================
window.viewRiderDetails = async (riderId) => {
  try {
    const riderDoc = await getDoc(doc(db, "riders", riderId))
    
    if (!riderDoc.exists()) {
      showNotification('❌ Rider not found', 'error')
      return
    }
    
    const rider = { id: riderDoc.id, ...riderDoc.data() }
    
    // Get orders for this rider
    const ordersSnapshot = await getDocs(
      query(collection(db, "orders"), where("riderId", "==", riderId))
    )
    
    const orders = []
    ordersSnapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() })
    })
    
    const completedOrders = orders.filter(o => o.status === 'delivered').length
    const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length
    
    // Create a nice modal for details
    const detailsHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
        <div style="background: linear-gradient(135deg, #3d2817, #2d1f13); border-radius: 24px; max-width: 500px; width: 90%; padding: 32px; box-shadow: 0 24px 80px rgba(0,0,0,0.6); border: 1px solid rgba(222, 184, 135, 0.3);" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2 style="margin: 0; color: #f5deb3; font-size: 24px;">👤 Rider Details</h2>
            <button onclick="this.closest('[style*=fixed]').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; transition: all 0.3s;">×</button>
          </div>
          
          <div style="background: rgba(139, 115, 85, 0.2); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
            <p style="margin: 10px 0; color: #DEB887;"><strong style="color: #f5deb3;">👤 Name:</strong> ${rider.name}</p>
            <p style="margin: 10px 0; color: #DEB887;"><strong style="color: #f5deb3;">📱 Phone:</strong> ${rider.phone}</p>
            <p style="margin: 10px 0; color: #DEB887;"><strong style="color: #f5deb3;">🏍️ Vehicle:</strong> <span style="text-transform: capitalize;">${rider.vehicle}</span></p>
            <p style="margin: 10px 0; color: #DEB887;"><strong style="color: #f5deb3;">📊 Status:</strong> ${rider.status || (rider.isOnline ? 'online' : 'offline')}</p>
          </div>
          
          <div style="background: rgba(76, 175, 80, 0.15); padding: 20px; border-radius: 12px; margin-bottom: 16px; border-left: 4px solid #4CAF50;">
            <h3 style="margin: 0 0 16px 0; color: #f5deb3; font-size: 18px;">📦 Delivery Statistics</h3>
            <p style="margin: 8px 0; color: #DEB887;"><strong style="color: #f5deb3;">Total Orders:</strong> ${orders.length}</p>
            <p style="margin: 8px 0; color: #DEB887;"><strong style="color: #f5deb3;">Active Orders:</strong> ${activeOrders}</p>
            <p style="margin: 8px 0; color: #DEB887;"><strong style="color: #f5deb3;">Completed:</strong> ${completedOrders}</p>
          </div>
          
          <div style="background: rgba(139, 115, 85, 0.2); padding: 20px; border-radius: 12px;">
            <p style="margin: 8px 0; color: #DEB887; font-size: 14px;"><strong style="color: #f5deb3;">📅 Created:</strong> ${new Date(rider.createdAt).toLocaleDateString()}</p>
            <p style="margin: 8px 0; color: #DEB887; font-size: 14px;"><strong style="color: #f5deb3;">⏰ Last Active:</strong> ${rider.lastActive ? new Date(rider.lastActive.toDate()).toLocaleString() : 'N/A'}</p>
          </div>
          
          <button onclick="this.closest('[style*=fixed]').remove()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #8B7355, #A0826D); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 20px; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            Close
          </button>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', detailsHTML)
  } catch (error) {
    console.error("Error viewing rider details:", error)
    showNotification('❌ Failed to load rider details', 'error')
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================
function showNotification(message, type = 'info') {
  const notification = document.createElement('div')
  notification.className = `notification notification-${type}`
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? 'linear-gradient(135deg, #4CAF50, #45a049)' : type === 'error' ? 'linear-gradient(135deg, #f44336, #d32f2f)' : type === 'warning' ? 'linear-gradient(135deg, #ff9800, #f57c00)' : 'linear-gradient(135deg, #2196F3, #1976D2)'};
    color: white;
    border-radius: 12px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    font-weight: 600;
    max-width: 400px;
  `
  
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out'
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, 4000)
}

function showError(message) {
  const ridersGrid = document.getElementById("riders-grid")
  ridersGrid.innerHTML = `
    <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 30px; background: rgba(61, 40, 23, 0.6); border-radius: 20px; border: 2px solid rgba(244, 67, 54, 0.5);">
      <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
      <h3 style="color: #ff9999; margin-bottom: 12px; font-size: 24px;">Error Loading Riders</h3>
      <p style="color: #DEB887; margin-bottom: 24px;">${message}</p>
      <button class="btn-primary" onclick="location.reload()">
        🔄 Refresh Page
      </button>
    </div>
  `
}

// ============================================================================
// STYLES
// ============================================================================
const style = document.createElement('style')
style.textContent = `
  .status-badge.online {
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
  }
  
  .status-badge.offline {
    background: linear-gradient(135deg, #9e9e9e, #757575);
    color: white;
  }
  
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
  
  /* Hidden input for rider ID */
  #rider-id {
    display: none;
  }
`
document.head.appendChild(style)

// Add hidden input to form for editing
const form = document.getElementById("add-rider-form")
if (form && !document.getElementById("rider-id")) {
  const hiddenInput = document.createElement("input")
  hiddenInput.type = "hidden"
  hiddenInput.id = "rider-id"
  form.insertBefore(hiddenInput, form.firstChild)
}

// Add IDs to modal elements
const modalTitle = document.querySelector(".modal-header h2")
if (modalTitle) modalTitle.id = "modal-title"

const submitBtn = document.querySelector("#add-rider-form button[type='submit']")
if (submitBtn) submitBtn.id = "submit-btn"

// ============================================================================
// UPDATE DASHBOARD RIDER COUNT (SYNC WITH DASHBOARD)
// ============================================================================
function updateDashboardRiderCount(totalRiders, activeRiders) {
  try {
    // Store in localStorage for dashboard to read
    localStorage.setItem('ridersCount', JSON.stringify({
      total: totalRiders,
      active: activeRiders,
      updatedAt: new Date().toISOString()
    }))
    console.log(`📊 Dashboard synced: ${activeRiders} active / ${totalRiders} total riders`)
  } catch (error) {
    console.warn('Could not sync with dashboard:', error)
  }
}

// ============================================================================
// INITIALIZE
// ============================================================================
console.log("🚀 Initializing Enhanced Riders Management...")

// Load profile
loadAdminProfile()

// Setup real-time updates with dashboard sync
try {
  const originalSetupRealtimeRiders = setupRealtimeRiders
  window.setupRealtimeRiders = function() {
    riderListeners.forEach(unsubscribe => unsubscribe())
    riderListeners = []

    const unsubscribe = onSnapshot(collection(db, "riders"), 
      (snapshot) => {
        const riders = []
        let activeCount = 0
        
        snapshot.forEach((doc) => {
          const rider = { id: doc.id, ...doc.data() }
          riders.push(rider)
          if (rider.status === 'online' || rider.isOnline) {
            activeCount++
          }
        })
        
        riders.sort((a, b) => {
          if (a.status === 'online' && b.status !== 'online') return -1
          if (a.status !== 'online' && b.status === 'online') return 1
          return (a.name || '').localeCompare(b.name || '')
        })
        
        displayRiders(riders)
        updateDashboardRiderCount(riders.length, activeCount)
        console.log(`Real-time riders update: ${activeCount} active / ${riders.length} total`)
      },
      (error) => {
        console.error("Error with real-time riders:", error)
        loadRiders()
      }
    )
    
    riderListeners.push(unsubscribe)
  }
  
  setupRealtimeRiders()
  console.log("✅ Riders Management Ready - Real-time Updates Active")
} catch (error) {
  console.error("Real-time updates not available:", error)
  loadRiders()
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  riderListeners.forEach(unsubscribe => {
    try {
      unsubscribe()
    } catch (e) {
      console.warn("Error unsubscribing:", e)
    }
  })
})

console.log("✅ Enhanced Riders Management System Loaded!")
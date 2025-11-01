// admin-orders.js - COMPLETE FIXED & IMPROVED VERSION WITH PROFILE
import { db, collection, getDocs, doc, updateDoc, getDoc, deleteDoc, Timestamp, onSnapshot } from "./firebase-config.js"

// ============================================================================
// AUTH CHECK
// ============================================================================
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
      showNotification("⚠️ Image size should be less than 2MB", 'warning')
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
      
      showNotification("✅ Profile picture updated!", 'success')
    }
    reader.readAsDataURL(file)
  })
}

// Logout function
window.adminLogout = () => {
  localStorage.removeItem("adminUser")
  window.location.href = "admin-login.html"
}

// ============================================================================
// GLOBAL STATE
// ============================================================================
let allOrders = []
let currentOrderId = null
let ordersListener = null
let availableRiders = []

// ============================================================================
// REAL-TIME ORDERS LISTENER
// ============================================================================
function setupRealtimeOrders() {
  if (ordersListener) {
    ordersListener()
  }

  let firstLoad = true

  ordersListener = onSnapshot(
    collection(db, "orders"),
    (snapshot) => {
      const previousOrders = new Map(allOrders.map(o => [o.id, o]))
      allOrders = []

      snapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() }
        allOrders.push(order)

        // Detect changes and show notifications (skip first load)
        if (!firstLoad) {
          const prevOrder = previousOrders.get(order.id)
          if (prevOrder) {
            // Rider declined
            if (order.declinedBy && !prevOrder.declinedBy) {
              showNotification(
                `⚠️ Order #${order.id.substring(0, 8)} declined!\nReason: ${order.declineReason || 'No reason provided'}`,
                'warning',
                8000
              )
              playNotificationSound()
            }
            // Rider accepted
            else if (order.status === 'picked_up' && prevOrder.status === 'assigned') {
              showNotification(
                `✅ Rider accepted Order #${order.id.substring(0, 8)}!`,
                'success',
                5000
              )
            }
            // Delivered
            else if (order.status === 'delivered' && prevOrder.status === 'in_transit') {
              showNotification(
                `🎉 Order #${order.id.substring(0, 8)} delivered!`,
                'success',
                5000
              )
            }
          } else {
            // New order
            showNotification(
              `🔔 New order #${order.id.substring(0, 8)} received!`,
              'info',
              5000
            )
            playNotificationSound()
          }
        }
      })

      firstLoad = false

      // Sort by date (newest first)
      allOrders.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt)
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt)
        return dateB - dateA
      })

      displayOrders(allOrders)
      updateOrderStats()
    },
    (error) => {
      console.error("❌ Real-time orders error:", error)
      showNotification("Connection error. Retrying...", 'error')
      setTimeout(() => loadOrders(), 3000)
    }
  )
}

// ============================================================================
// NOTIFICATION SOUND
// ============================================================================
function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi1+zPDTfS8GJHzM8OeLNgkXbL3q7Kj/')
    audio.volume = 0.3
    audio.play().catch(() => {})
  } catch (e) {
    console.warn("Could not play sound:", e)
  }
}

// ============================================================================
// ORDER STATISTICS
// ============================================================================
function updateOrderStats() {
  const stats = {
    pending: allOrders.filter(o => o.status === 'pending').length,
    processing: allOrders.filter(o => o.status === 'processing').length,
    ready: allOrders.filter(o => o.status === 'ready').length,
    assigned: allOrders.filter(o => o.status === 'assigned').length,
    declined: allOrders.filter(o => o.declinedBy && o.status === 'ready').length,
    active: allOrders.filter(o => ['picked_up', 'in_transit'].includes(o.status)).length,
    delivered: allOrders.filter(o => o.status === 'delivered').length
  }

  const statsContainer = document.getElementById('order-stats')
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-number">${stats.pending}</div>
        <div class="stat-label">Pending Approval</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-number">${stats.ready}</div>
        <div class="stat-label">Ready to Assign</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon">⚠️</div>
        <div class="stat-number">${stats.declined}</div>
        <div class="stat-label">Declined Orders</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🛵</div>
        <div class="stat-number">${stats.assigned}</div>
        <div class="stat-label">Awaiting Pickup</div>
      </div>
      <div class="stat-card active">
        <div class="stat-icon">🚚</div>
        <div class="stat-number">${stats.active}</div>
        <div class="stat-label">Order On the Way</div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">✅</div>
        <div class="stat-number">${stats.delivered}</div>
        <div class="stat-label">Delivered Today</div>
      </div>
    `
  }
}

// ============================================================================
// LOAD ORDERS (FALLBACK)
// ============================================================================
async function loadOrders() {
  try {
    console.log("📋 Loading orders...")
    const ordersSnapshot = await getDocs(collection(db, "orders"))
    allOrders = []

    ordersSnapshot.forEach((doc) => {
      allOrders.push({ id: doc.id, ...doc.data() })
    })

    allOrders.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt)
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt)
      return dateB - dateA
    })

    displayOrders(allOrders)
    updateOrderStats()
    console.log(`✅ Loaded ${allOrders.length} orders`)
  } catch (error) {
    console.error("❌ Error loading orders:", error)
    showNotification("Failed to load orders: " + error.message, 'error')
  }
}

// ============================================================================
// DISPLAY ORDERS
// ============================================================================
function displayOrders(orders) {
  const tbody = document.getElementById("orders-tbody")

  if (!tbody) {
    console.error("❌ orders-tbody element not found")
    return
  }

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 60px; color: #DEB887;">
          <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No orders yet</div>
          <div style="font-size: 14px;">Orders will appear here when customers place them</div>
        </td>
      </tr>
    `
    return
  }

  tbody.innerHTML = ""

  orders.forEach(order => {
    // Decline warning
    let declineInfo = ''
    if (order.declinedBy && order.declineReason) {
      const declineTime = order.declinedAt?.toDate?.() || new Date(order.declinedAt)
      declineInfo = `
        <div class="decline-warning">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 16px;">⚠️</span>
            <strong>Rider Declined</strong>
          </div>
          <div style="font-size: 11px; color: #856404;">
            ${order.declineReason}<br>
            <span style="opacity: 0.8;">${declineTime.toLocaleString()}</span>
          </div>
        </div>
      `
    }

    // Rider info
    let riderInfo = ''
    if (order.riderId && order.riderName) {
      const statusIcon = order.status === 'assigned' ? '⏳' :
                        order.status === 'picked_up' ? '📦' :
                        order.status === 'in_transit' ? '🚚' : '🛵'
      riderInfo = `
        <div style="margin-top: 6px; font-size: 12px; color: #667eea; display: flex; align-items: center; gap: 6px;">
          ${statusIcon} <strong>${order.riderName}</strong>
        </div>
      `
    }

    const row = document.createElement('tr')
    row.className = order.declinedBy ? 'declined-order' : ''
    row.innerHTML = `
      <td>
        <strong>#${order.id.substring(0, 8)}</strong>
        <div style="font-size: 11px; color: #999; margin-top: 2px;">
          ${new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleTimeString()}
        </div>
      </td>
      <td>
        <strong>${order.fullName || 'Unknown'}</strong>
        <div style="font-size: 11px; color: #666;">${order.phone || 'N/A'}</div>
      </td>
      <td>${order.items?.length || 0} item${(order.items?.length || 0) > 1 ? 's' : ''}</td>
      <td><strong>₱${(order.total || 0).toFixed(2)}</strong></td>
      <td>
        <span class="status-badge ${order.status}">${getStatusLabel(order.status)}</span>
        ${riderInfo}
        ${declineInfo}
      </td>
      <td>${new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleDateString()}</td>
      <td>
        <div class="action-buttons">
          ${getOrderActionButtons(order)}
        </div>
      </td>
    `

    // Add event listeners to action buttons
    const viewBtn = row.querySelector('.btn-view')
    if (viewBtn) viewBtn.addEventListener('click', () => viewOrder(order.id))

    const approveBtn = row.querySelector('.btn-approve')
    if (approveBtn) approveBtn.addEventListener('click', () => updateOrderStatus(order.id, 'processing'))

    const readyBtn = row.querySelector('.btn-ready')
    if (readyBtn) readyBtn.addEventListener('click', () => updateOrderStatus(order.id, 'ready'))

    const assignBtn = row.querySelector('.btn-assign')
    if (assignBtn) assignBtn.addEventListener('click', () => openRiderModal(order.id))

    const waitingBtn = row.querySelector('.btn-waiting')
    if (waitingBtn) waitingBtn.addEventListener('click', () => openRiderModal(order.id))

    const completeBtn = row.querySelector('.btn-complete')
    if (completeBtn) completeBtn.addEventListener('click', () => markOrderDone(order.id))

    const cancelBtn = row.querySelector('.btn-cancel')
    if (cancelBtn) cancelBtn.addEventListener('click', () => cancelOrder(order.id))

    const deleteBtn = row.querySelector('.btn-delete')
    if (deleteBtn) deleteBtn.addEventListener('click', () => deleteOrder(order.id))

    tbody.appendChild(row)
  })
}

// ============================================================================
// STATUS LABELS
// ============================================================================
function getStatusLabel(status) {
  const labels = {
    'pending': 'Pending',
    'processing': 'Processing',
    'ready': 'Ready',
    'assigned': 'Assigned',
    'picked_up': 'Picked Up',
    'in_transit': 'In Transit',
    'delivered': 'Delivered',
    'done': 'Completed',
    'cancelled': 'Cancelled'
  }
  return labels[status] || status.toUpperCase()
}

// ============================================================================
// ORDER ACTION BUTTONS
// ============================================================================
function getOrderActionButtons(order) {
  let buttons = []

  buttons.push(`<button class="btn-view" title="View Details">👁️</button>`)

  if (order.status === "pending") {
    buttons.push(`<button class="btn-approve" title="Approve Order">✓</button>`)
  }

  if (order.status === "processing") {
    buttons.push(`<button class="btn-ready" title="Mark Ready">📦</button>`)
  }

  if (order.status === "ready" || (order.status === "assigned" && order.declinedBy)) {
    const label = order.declinedBy ? '🔄' : '🛵'
    const title = order.declinedBy ? 'Reassign Rider' : 'Assign Rider'
    buttons.push(`<button class="btn-assign" title="${title}">${label}</button>`)
  }

  if (order.status === "assigned" && !order.declinedBy) {
    buttons.push(`<button class="btn-waiting" title="Waiting for acceptance">⏳</button>`)
  }

  if (order.status === "delivered") {
    buttons.push(`<button class="btn-complete" title="Complete Order">✓</button>`)
  }

  if (!['done', 'cancelled', 'delivered'].includes(order.status)) {
    buttons.push(`<button class="btn-cancel" title="Cancel Order">✖</button>`)
  }

  buttons.push(`<button class="btn-delete" title="Delete Order">🗑️</button>`)

  return buttons.join('')
}

// ============================================================================
// FILTER ORDERS
// ============================================================================
window.filterOrders = () => {
  const status = document.getElementById("status-filter")?.value

  if (!status || status === "all") {
    displayOrders(allOrders)
  } else if (status === "declined") {
    displayOrders(allOrders.filter(o => o.declinedBy && o.status === 'ready'))
  } else {
    displayOrders(allOrders.filter(o => o.status === status))
  }
}

// ============================================================================
// VIEW ORDER DETAILS
// ============================================================================
async function viewOrder(orderId) {
  try {
    const orderDoc = await getDoc(doc(db, "orders", orderId))

    if (orderDoc.exists()) {
      const order = { id: orderDoc.id, ...orderDoc.data() }
      const content = document.getElementById("order-details-content")

      if (!content) {
        console.error("❌ order-details-content not found")
        return
      }

      content.innerHTML = `
        <div style="margin-bottom: 24px;">
          <h3 style="margin-bottom: 16px; color: #f5deb3;">Order Information</h3>
          <p style="margin-bottom: 8px;"><strong>Order ID:</strong> ${order.id}</p>
          <p style="margin-bottom: 8px;"><strong>Status:</strong> <span class="status-badge ${order.status}">${getStatusLabel(order.status)}</span></p>
          <p style="margin-bottom: 8px;"><strong>Date:</strong> ${new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleString()}</p>
          <p style="margin-bottom: 8px;"><strong>Customer:</strong> ${order.fullName || 'N/A'}</p>
          <p style="margin-bottom: 8px;"><strong>Phone:</strong> ${order.phone || 'N/A'}</p>
          <p style="margin-bottom: 8px;"><strong>Address:</strong> ${order.address || 'N/A'}</p>
          <p style="margin-bottom: 8px;"><strong>Total:</strong> ₱${(order.total || 0).toFixed(2)}</p>
          ${order.riderName ? `<p style="margin-bottom: 8px;"><strong>Rider:</strong> ${order.riderName}</p>` : ''}
        </div>
        <div>
          <h4 style="color: #f5deb3; margin-bottom: 12px;">Items:</h4>
          <ul style="margin-top: 8px; padding-left: 20px;">
            ${(order.items || []).map(item => `
              <li style="margin-bottom: 6px;">${item.name} (x${item.quantity}) - ₱${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</li>
            `).join('')}
          </ul>
        </div>
      `

      document.getElementById("order-modal")?.classList.add("active")
    }
  } catch (error) {
    console.error("❌ Error loading order:", error)
    showNotification("Failed to load order details", 'error')
  }
}

window.closeOrderModal = () => {
  document.getElementById("order-modal")?.classList.remove("active")
}

// ============================================================================
// UPDATE ORDER STATUS
// ============================================================================
async function updateOrderStatus(orderId, newStatus) {
  try {
    const updateData = {
      status: newStatus,
      updatedAt: Timestamp.now()
    }

    if (newStatus === "processing") {
      updateData.processedAt = Timestamp.now()
    } else if (newStatus === "ready") {
      updateData.readyAt = Timestamp.now()
    }

    await updateDoc(doc(db, "orders", orderId), updateData)
    showNotification(`✅ Order updated to ${getStatusLabel(newStatus)}`, 'success')
  } catch (error) {
    console.error("❌ Error updating order:", error)
    showNotification("Failed to update order: " + error.message, 'error')
  }
}

// ============================================================================
// MARK ORDER DONE
// ============================================================================
async function markOrderDone(orderId) {
  if (!confirm("Mark this order as completed?")) return

  try {
    const orderDoc = await getDoc(doc(db, "orders", orderId))
    if (orderDoc.exists()) {
      const order = orderDoc.data()

      if (order.riderId) {
        try {
          await updateDoc(doc(db, "riders", order.riderId), {
            isTracking: false,
            trackingStopped: Timestamp.now(),
            lastActive: Timestamp.now()
          })
        } catch (e) {
          console.warn("Could not update rider:", e)
        }
      }
    }

    await updateDoc(doc(db, "orders", orderId), {
      status: "done",
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })

    showNotification("✅ Order completed!", 'success')
  } catch (error) {
    console.error("❌ Error:", error)
    showNotification("Failed to complete order: " + error.message, 'error')
  }
}

// ============================================================================
// CANCEL ORDER
// ============================================================================
async function cancelOrder(orderId) {
  const reason = prompt("Reason for cancellation (optional):")

  if (reason === null) return

  try {
    const orderDoc = await getDoc(doc(db, "orders", orderId))
    if (orderDoc.exists()) {
      const order = orderDoc.data()

      if (order.riderId) {
        try {
          await updateDoc(doc(db, "riders", order.riderId), {
            isTracking: false,
            trackingStopped: Timestamp.now(),
            lastActive: Timestamp.now()
          })
        } catch (e) {
          console.warn("Could not update rider:", e)
        }
      }
    }

    await updateDoc(doc(db, "orders", orderId), {
      status: "cancelled",
      cancelledAt: Timestamp.now(),
      cancellationReason: reason || "Admin cancelled",
      riderId: null,
      riderName: null,
      updatedAt: Timestamp.now()
    })

    showNotification("✅ Order cancelled", 'success')
  } catch (error) {
    console.error("❌ Error:", error)
    showNotification("Failed to cancel order: " + error.message, 'error')
  }
}

// ============================================================================
// DELETE ORDER
// ============================================================================
async function deleteOrder(orderId) {
  if (!confirm("⚠️ DELETE ORDER?\n\nOrder ID: #" + orderId.substring(0, 8) + "\n\nThis action CANNOT be undone!")) {
    return
  }

  try {
    console.log(`🗑️ Deleting order: ${orderId}`)

    try {
      const orderDoc = await getDoc(doc(db, "orders", orderId))
      if (orderDoc.exists()) {
        const order = orderDoc.data()

        if (order.riderId) {
          console.log(`Clearing tracking for rider: ${order.riderId}`)
          await updateDoc(doc(db, "riders", order.riderId), {
            isTracking: false,
            trackingStopped: Timestamp.now(),
            lastActive: Timestamp.now()
          }).catch(e => console.warn("Could not update rider:", e))
        }
      }
    } catch (e) {
      console.warn("Could not fetch order:", e)
    }

    await deleteDoc(doc(db, "orders", orderId))

    console.log(`✅ Order ${orderId} deleted`)
    showNotification("✅ Order deleted!", 'success')

  } catch (error) {
    console.error("❌ Delete error:", error)
    showNotification("Failed to delete: " + error.message, 'error', 6000)
  }
}

// ============================================================================
// OPEN RIDER MODAL
// ============================================================================
async function openRiderModal(orderId) {
  if (!orderId) {
    console.error("❌ No order ID provided")
    showNotification("Invalid order ID", 'error')
    return
  }

  currentOrderId = orderId

  try {
    console.log(`🛵 Opening rider modal for order: ${orderId}`)

    const riderModal = document.getElementById("rider-modal")
    const riderSelect = document.getElementById("rider-select")
    const modalOrderInfo = document.getElementById("modal-order-info")

    if (!riderModal || !riderSelect) {
      console.error("❌ Modal elements not found")
      showNotification("Modal elements missing. Please refresh the page.", 'error', 5000)
      return
    }

    riderSelect.innerHTML = '<option value="">🔄 Loading riders...</option>'
    riderSelect.disabled = true

    const orderDoc = await getDoc(doc(db, "orders", orderId))

    if (!orderDoc.exists()) {
      console.error("❌ Order not found:", orderId)
      showNotification("Order not found", 'error')
      return
    }

    const order = { id: orderDoc.id, ...orderDoc.data() }

    const ridersSnapshot = await getDocs(collection(db, "riders"))

    if (ridersSnapshot.empty) {
      riderSelect.innerHTML = '<option value="">❌ No riders available</option>'
      showNotification("No riders registered. Please add riders first.", 'warning', 5000)
      riderModal.classList.add("active")
      return
    }

    riderSelect.innerHTML = '<option value="">-- Select a Rider --</option>'
    riderSelect.disabled = false

    let onlineCount = 0
    availableRiders = []

    ridersSnapshot.forEach((riderDoc) => {
      const rider = { id: riderDoc.id, ...riderDoc.data() }
      availableRiders.push(rider)

      const isOnline = rider.status === "online" || rider.isOnline === true
      if (isOnline) onlineCount++

      const isCurrent = order.riderId === riderDoc.id
      const statusIcon = isOnline ? '🟢' : '🔴'
      const currentLabel = isCurrent ? ' (Current)' : ''
      const offlineLabel = !isOnline ? ' (Offline)' : ''

      const option = document.createElement('option')
      option.value = riderDoc.id
      option.textContent = `${statusIcon} ${rider.name} - ${rider.vehicle}${currentLabel}${offlineLabel}`
      if (isCurrent) option.selected = true

      riderSelect.appendChild(option)
    })

    if (modalOrderInfo) {
      modalOrderInfo.innerHTML = `
        <div class="order-info-card">
          <strong>Order #${order.id.substring(0, 8)}</strong>
          <span>${order.fullName || 'Unknown'} • ₱${(order.total || 0).toFixed(2)}</span>
        </div>
      `
    }

    if (onlineCount === 0) {
      showNotification(`⚠️ No online riders available`, 'warning', 4000)
    } else {
      showNotification(`✅ ${onlineCount} rider${onlineCount > 1 ? 's' : ''} online`, 'success', 2000)
    }

    riderModal.classList.add("active")

  } catch (error) {
    console.error("❌ Error opening rider modal:", error)
    showNotification("Failed to load riders: " + error.message, 'error', 6000)
  }
}

window.closeRiderModal = () => {
  const riderModal = document.getElementById("rider-modal")
  if (riderModal) {
    riderModal.classList.remove("active")
  }
  currentOrderId = null
}

// ============================================================================
// ASSIGN RIDER
// ============================================================================
const assignForm = document.getElementById("assign-rider-form")
if (assignForm) {
  assignForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const riderId = document.getElementById("rider-select")?.value

    if (!riderId) {
      showNotification("⚠️ Please select a rider", 'warning')
      return
    }

    if (!currentOrderId) {
      showNotification("❌ No order selected", 'error')
      return
    }

    const submitBtn = e.target.querySelector('button[type="submit"]')
    const originalText = submitBtn.textContent
    submitBtn.disabled = true
    submitBtn.textContent = '⏳ Assigning...'

    try {
      const riderDoc = await getDoc(doc(db, "riders", riderId))
      if (!riderDoc.exists()) {
        throw new Error("Rider not found")
      }

      const rider = riderDoc.data()

      await updateDoc(doc(db, "orders", currentOrderId), {
        riderId: riderId,
        riderName: rider.name || 'Unknown',
        riderPhone: rider.phone || '',
        status: "assigned",
        assignedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        declinedBy: null,
        declineReason: null,
        declinedAt: null,
        acceptedAt: null
      })

      await updateDoc(doc(db, "riders", riderId), {
        lastActive: Timestamp.now()
      })

      showNotification(`✅ Assigned to ${rider.name}! Waiting for acceptance...`, 'success', 5000)
      closeRiderModal()

    } catch (error) {
      console.error("❌ Assignment error:", error)
      showNotification("Failed to assign: " + error.message, 'error', 5000)
      submitBtn.disabled = false
      submitBtn.textContent = originalText
    }
  })
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================
function showNotification(message, type = 'info', duration = 4000) {
  const notification = document.createElement('div')
  notification.className = `notification notification-${type}`
  notification.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <span style="font-size: 20px;">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
      </span>
      <span style="flex: 1; white-space: pre-wrap;">${message}</span>
    </div>
  `
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 20px;
    background: ${
      type === 'success' ? 'linear-gradient(135deg, #4CAF50, #45a049)' :
      type === 'error' ? 'linear-gradient(135deg, #f44336, #d32f2f)' :
      type === 'warning' ? 'linear-gradient(135deg, #ff9800, #f57c00)' :
      'linear-gradient(135deg, #2196F3, #1976d2)'
    };
    color: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
    font-weight: 500;
    font-size: 14px;
    line-height: 1.5;
  `

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out'
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, duration)
}

// ============================================================================
// STYLES
// ============================================================================
const style = document.createElement('style')
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @keyframes pulse-badge {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.85; transform: scale(0.98); }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .action-buttons button {
    font-size: 14px;
    padding: 8px 12px;
    white-space: nowrap;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .action-buttons button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }

  .action-buttons button:active {
    transform: translateY(0);
  }

  .btn-view {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
  }

  .btn-approve {
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
  }

  .btn-ready {
    background: linear-gradient(135deg, #2196F3, #1976d2);
    color: white;
  }

  .btn-assign {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    font-size: 16px;
    padding: 8px 14px;
  }

  .btn-waiting {
    background: linear-gradient(135deg, #ff9800, #f57c00);
    color: white;
    animation: pulse 2s infinite;
  }

  .btn-complete {
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
  }

  .btn-cancel {
    background: linear-gradient(135deg, #f44336, #d32f2f);
    color: white;
  }

  .btn-delete {
    background: linear-gradient(135deg, #666, #444);
    color: white;
  }

  /* Status Badges */
  .status-badge {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .status-badge.pending {
    background: linear-gradient(135deg, #fff3cd, #ffe8a1);
    color: #856404;
  }

  .status-badge.processing {
    background: linear-gradient(135deg, #cfe2ff, #b3d9ff);
    color: #084298;
  }

  .status-badge.ready {
    background: linear-gradient(135deg, #d1ecf1, #b8e4ec);
    color: #0c5460;
  }

  .status-badge.assigned {
    background: linear-gradient(135deg, #fff8e1, #ffecb3);
    color: #f57c00;
    animation: pulse-badge 2s infinite;
  }

  .status-badge.picked_up {
    background: linear-gradient(135deg, #d1ecf1, #b8e4ec);
    color: #0c5460;
  }

  .status-badge.in_transit {
    background: linear-gradient(135deg, #cce5ff, #b3d9ff);
    color: #004085;
  }

  .status-badge.delivered {
    background: linear-gradient(135deg, #d4edda, #c3e6cb);
    color: #155724;
  }

  .status-badge.done {
    background: linear-gradient(135deg, #d4edda, #c3e6cb);
    color: #155724;
  }

  .status-badge.cancelled {
    background: linear-gradient(135deg, #f8d7da, #f5c2c7);
    color: #721c24;
  }

  /* Decline Warning */
  .decline-warning {
    margin-top: 8px;
    padding: 12px;
    background: linear-gradient(135deg, #fff3cd, #ffe8a1);
    border-radius: 8px;
    font-size: 12px;
    border-left: 4px solid #ff9800;
    animation: shake 0.5s;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }

  .declined-order {
    background: linear-gradient(135deg, rgba(255, 248, 240, 0.3), rgba(255, 243, 224, 0.3)) !important;
  }

  .declined-order:hover {
    background: linear-gradient(135deg, rgba(255, 243, 224, 0.4), rgba(255, 232, 204, 0.4)) !important;
  }

  /* Order Stats */
  .stat-card {
    background: rgba(61, 40, 23, 0.8);
    backdrop-filter: blur(20px);
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    transition: all 0.3s;
    border: 1px solid rgba(222, 184, 135, 0.2);
    text-align: center;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
    border-color: rgba(222, 184, 135, 0.4);
  }

  .stat-card.warning {
    border-color: rgba(255, 152, 0, 0.5);
  }

  .stat-card.active {
    border-color: rgba(33, 150, 243, 0.5);
  }

  .stat-card.success {
    border-color: rgba(76, 175, 80, 0.5);
  }

  .stat-icon {
    font-size: 42px;
    margin-bottom: 12px;
  }

  .stat-number {
    font-size: 32px;
    font-weight: 800;
    color: #f5deb3;
    margin-bottom: 8px;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .stat-label {
    font-size: 13px;
    color: #DEB887;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  /* Order Info Card */
  .order-info-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: linear-gradient(135deg, #8B7355, #A0826D);
    color: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(139, 115, 85, 0.4);
    margin-bottom: 20px;
  }

  .order-info-card strong {
    font-size: 16px;
  }

  .order-info-card span {
    font-size: 14px;
    opacity: 0.95;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .action-buttons {
      flex-direction: column;
    }

    .action-buttons button {
      width: 100%;
    }
  }
`
document.head.appendChild(style)

// ============================================================================
// INITIALIZE
// ============================================================================
console.log("🚀 Initializing Admin Orders System...")

// Load profile first
loadAdminProfile()

// Setup real-time orders
try {
  setupRealtimeOrders()
  console.log("✅ Admin Orders System Ready - Real-time Updates Active")
  showNotification("✅ Connected! Real-time updates active", 'success', 3000)
} catch (error) {
  console.error("❌ Initialization error:", error)
  loadOrders()
  showNotification("⚠️ Using fallback mode", 'warning', 3000)
}

// ============================================================================
// CLEANUP
// ============================================================================
window.addEventListener('beforeunload', () => {
  if (ordersListener) {
    ordersListener()
    console.log("✅ Cleaned up listeners")
  }
})
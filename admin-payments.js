import { db, collection, getDocs, doc, updateDoc, getDoc, onSnapshot } from "./firebase-config.js"

// ============================================================================
// AUTHENTICATION CHECK
// ============================================================================
const adminUser = JSON.parse(localStorage.getItem("adminUser"))
if (!adminUser) {
  window.location.href = "admin-login.html"
}

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================
let paymentsListener = null;

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

// Logout function
const logoutBtn = document.getElementById("logout-btn")
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("adminUser")
      window.location.href = "admin-login.html"
    }
  })
}

// ============================================================================
// REAL-TIME PAYMENTS UPDATES
// ============================================================================
function setupRealtimePayments() {
  if (paymentsListener) {
    paymentsListener()
  }

  console.log("📊 Setting up real-time payments listener...")

  paymentsListener = onSnapshot(
    collection(db, "orders"),
    (ordersSnapshot) => {
      console.log(`💳 Payments updated - ${ordersSnapshot.size} orders`)
      loadPayments(ordersSnapshot)
      updatePaymentStats(ordersSnapshot)
    },
    (error) => {
      console.error("❌ Payments listener error:", error)
      loadPaymentsOnce()
    }
  )
}

// ============================================================================
// UPDATE PAYMENT STATISTICS
// ============================================================================
function updatePaymentStats(ordersSnapshot) {
  let totalRevenue = 0
  let verifiedPayments = 0
  let pendingPayments = 0

  ordersSnapshot.forEach((doc) => {
    const order = doc.data()
    if (order.status !== "cancelled") {
      totalRevenue += order.total || 0
    }
    
    if (order.status === "done" || order.status === "delivered") {
      verifiedPayments++
    } else if (order.status === "pending" || order.status === "processing") {
      pendingPayments++
    }
  })

  console.log("💰 Payment Stats:", {
    totalRevenue,
    verifiedPayments,
    pendingPayments
  })

  // Update UI if stats elements exist
  const revenueElement = document.getElementById("payments-revenue")
  if (revenueElement) {
    revenueElement.textContent = `₱${totalRevenue.toFixed(2)}`
  }

  const verifiedElement = document.getElementById("verified-payments")
  if (verifiedElement) {
    verifiedElement.textContent = verifiedPayments
  }

  const pendingElement = document.getElementById("pending-payments")
  if (pendingElement) {
    pendingElement.textContent = pendingPayments
  }
}

// ============================================================================
// LOAD ALL PAYMENTS (REAL-TIME)
// ============================================================================
function loadPayments(ordersSnapshot) {
  const tbody = document.getElementById("payments-tbody")
  if (!tbody) return

  if (ordersSnapshot.empty) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #DEB887; padding: 40px;"><div style="font-size: 48px; margin-bottom: 16px;">💳</div><div style="font-size: 16px;">No payments found</div></td></tr>'
    return
  }

  const orders = []
  ordersSnapshot.forEach((doc) => {
    const data = doc.data()
    orders.push({ 
      id: doc.id, 
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
    })
  })

  // Sort by date (newest first)
  orders.sort((a, b) => b.createdAt - a.createdAt)

  tbody.innerHTML = ""

  orders.forEach((order) => {
    const paymentStatus =
      order.status === "done" || order.status === "delivered" 
        ? "Verified" 
        : order.status === "cancelled" 
        ? "Cancelled" 
        : "Pending"
    
    const statusClass = 
      order.status === "done" || order.status === "delivered"
        ? "done" 
        : order.status === "cancelled" 
        ? "cancelled" 
        : "pending"

    const row = document.createElement("tr")
    row.style.transition = "all 0.3s"
    row.innerHTML = `
      <td>#${order.id.substring(0, 8)}</td>
      <td>${order.fullName}</td>
      <td>₱${order.total.toFixed(2)}</td>
      <td>${order.receiptNumber || "N/A"}</td>
      <td><span class="status-badge ${statusClass}">${paymentStatus}</span></td>
      <td>${order.createdAt.toLocaleDateString()} ${order.createdAt.toLocaleTimeString()}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-edit" title="View Details">👁️ View</button>
          ${order.status === "pending" || order.status === "processing" 
            ? `<button class="btn-primary" style="font-size: 12px;" title="Mark as Verified">✓ Verify</button>` 
            : ""}
        </div>
      </td>
    `

    // Add event listeners
    const viewBtn = row.querySelector(".btn-edit")
    if (viewBtn) {
      viewBtn.addEventListener("click", () => viewPayment(order.id))
    }

    const verifyBtn = row.querySelector(".btn-primary")
    if (verifyBtn) {
      verifyBtn.addEventListener("click", () => markPaymentDone(order.id))
    }

    tbody.appendChild(row)
  })

  console.log(`✅ Loaded ${orders.length} payments`)
}

// ============================================================================
// LOAD PAYMENTS ONCE (FALLBACK)
// ============================================================================
async function loadPaymentsOnce() {
  try {
    console.log("📋 Loading payments (fallback mode)...")
    const ordersSnapshot = await getDocs(collection(db, "orders"))
    loadPayments(ordersSnapshot)
    updatePaymentStats(ordersSnapshot)
  } catch (error) {
    console.error("Error loading payments:", error)
    showNotification("Failed to load payments", "error")
  }
}

// ============================================================================
// VIEW PAYMENT DETAILS
// ============================================================================
async function viewPayment(orderId) {
  try {
    const orderDoc = await getDoc(doc(db, "orders", orderId))

    if (orderDoc.exists()) {
      const order = { id: orderDoc.id, ...orderDoc.data() }
      const content = document.getElementById("payment-details-content")

      const orderDate = order.createdAt?.toDate 
        ? order.createdAt.toDate() 
        : new Date(order.createdAt)

      content.innerHTML = `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #f5deb3; margin-bottom: 16px;">💳 Payment Information</h3>
          <p style="margin-bottom: 8px;"><strong>Order ID:</strong> ${order.id}</p>
          <p style="margin-bottom: 8px;"><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
          <p style="margin-bottom: 8px;"><strong>Receipt Number:</strong> ${order.receiptNumber || "N/A"}</p>
          <p style="margin-bottom: 8px;"><strong>Amount:</strong> <span style="color: #4CAF50; font-size: 18px; font-weight: 700;">₱${order.total.toFixed(2)}</span></p>
          <p style="margin-bottom: 8px;"><strong>Status:</strong> <span class="status-badge ${order.status}">${order.status.toUpperCase()}</span></p>
          <p style="margin-bottom: 8px;"><strong>Date:</strong> ${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString()}</p>
        </div>
        
        <div style="margin-bottom: 24px;">
          <h3 style="color: #f5deb3; margin-bottom: 16px;">👤 Customer Information</h3>
          <p style="margin-bottom: 8px;"><strong>Name:</strong> ${order.fullName}</p>
          <p style="margin-bottom: 8px;"><strong>Email:</strong> ${order.email || 'N/A'}</p>
          <p style="margin-bottom: 8px;"><strong>Phone:</strong> ${order.phone}</p>
          <p style="margin-bottom: 8px;"><strong>Address:</strong> ${order.deliveryAddress || 'N/A'}</p>
        </div>

        ${order.items && order.items.length > 0 ? `
          <div style="margin-bottom: 24px;">
            <h3 style="color: #f5deb3; margin-bottom: 16px;">📦 Order Items</h3>
            ${order.items.map(item => `
              <div style="padding: 12px; background: rgba(139, 115, 85, 0.2); border-radius: 8px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between;">
                  <span><strong>${item.name}</strong></span>
                  <span>₱${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div style="font-size: 13px; color: #DEB887; margin-top: 4px;">
                  Qty: ${item.quantity} × ₱${item.price.toFixed(2)}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${order.receiptImageUrl ? `
          <div style="margin-bottom: 24px;">
            <h3 style="color: #f5deb3; margin-bottom: 16px;">🧾 Receipt Image</h3>
            <img src="${order.receiptImageUrl}" alt="Receipt" 
                 style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer;"
                 onclick="window.open('${order.receiptImageUrl}', '_blank')">
            <p style="font-size: 12px; color: #999; margin-top: 8px; text-align: center;">Click image to view full size</p>
          </div>
        ` : ''}
      `

      document.getElementById("payment-modal").classList.add("active")
    }
  } catch (error) {
    console.error("Error loading payment:", error)
    showNotification("Failed to load payment details", "error")
  }
}

window.closePaymentModal = () => {
  document.getElementById("payment-modal").classList.remove("active")
}

// ============================================================================
// MARK PAYMENT AS DONE
// ============================================================================
async function markPaymentDone(orderId) {
  if (!confirm("Mark this payment as verified and complete?")) return

  try {
    await updateDoc(doc(db, "orders", orderId), {
      status: "done",
      updatedAt: new Date().toISOString(),
    })

    showNotification("Payment verified successfully!", "success")
    console.log(`✅ Payment ${orderId} marked as done`)
  } catch (error) {
    console.error("Error updating payment:", error)
    showNotification("Failed to update payment", "error")
  }
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================
function showNotification(message, type = "success") {
  const notification = document.createElement("div")
  
  const icons = {
    success: "✓",
    error: "⚠️",
    warning: "⚠️",
    info: "ℹ️"
  }
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 24px;">${icons[type] || icons.info}</span>
      <span>${message}</span>
    </div>
  `
  
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
    min-width: 300px;
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
// FILTER PAYMENTS
// ============================================================================
function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn')
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      filterBtns.forEach(b => b.classList.remove('active'))
      
      // Add active class to clicked button
      btn.classList.add('active')
      
      const filter = btn.dataset.filter
      filterPayments(filter)
    })
  })
}

function filterPayments(status) {
  const rows = document.querySelectorAll('#payments-tbody tr')
  
  rows.forEach(row => {
    if (status === 'all') {
      row.style.display = ''
    } else {
      const statusBadge = row.querySelector('.status-badge')
      if (statusBadge && statusBadge.classList.contains(status)) {
        row.style.display = ''
      } else {
        row.style.display = 'none'
      }
    }
  })
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

  .status-badge {
    padding: 6px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.done {
    background: rgba(76, 175, 80, 0.2);
    color: #4CAF50;
    border: 1px solid rgba(76, 175, 80, 0.5);
  }

  .status-badge.pending {
    background: rgba(255, 152, 0, 0.2);
    color: #ff9800;
    border: 1px solid rgba(255, 152, 0, 0.5);
  }

  .status-badge.cancelled {
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
    border: 1px solid rgba(244, 67, 54, 0.5);
  }

  .action-buttons {
    display: flex;
    gap: 8px;
  }

  #payments-tbody tr:hover {
    background: rgba(222, 184, 135, 0.1);
  }
`
document.head.appendChild(style)

// ============================================================================
// CLEANUP ON PAGE UNLOAD
// ============================================================================
window.addEventListener('beforeunload', () => {
  if (paymentsListener) {
    paymentsListener()
    console.log("✅ Payments listener cleaned up")
  }
})

// ============================================================================
// INITIALIZE
// ============================================================================
console.log("🚀 Initializing Payments Management...")

// Load profile
loadAdminProfile()

// Setup real-time payments
try {
  setupRealtimePayments()
  console.log("✅ Payments Management Ready - Real-time Updates Active")
} catch (error) {
  console.error("❌ Failed to setup real-time updates:", error)
  loadPaymentsOnce()
}

// Setup filters if filter buttons exist
setTimeout(() => {
  setupFilters()
}, 1000)
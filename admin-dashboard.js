// admin-dashboard.js - ENHANCED VERSION WITH ADMIN REPLY
import { db, collection, getDocs, onSnapshot, query, orderBy, limit, doc, deleteDoc, updateDoc } from "./firebase-config.js";

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================
let dashboardListener = null;
let ridersListener = null;
let deliveryNotificationsListener = null;
let feedbackListener = null;
let bestSellersChart = null;

// Store for managing delete confirmation
let pendingDeleteFeedbackId = null;
let activeReplyFeedbackId = null;

// ============================================================================
// AUTHENTICATION CHECK
// ============================================================================
const adminUser = JSON.parse(localStorage.getItem("adminUser"));
if (!adminUser) {
  window.location.href = "admin-login.html";
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================
function loadAdminProfile() {
  const adminUser = JSON.parse(localStorage.getItem("adminUser"));
  
  if (adminUser) {
    const nameElement = document.getElementById("admin-name");
    if (nameElement) {
      nameElement.textContent = adminUser.name || "Admin User";
    }
    
    const headerNameElement = document.getElementById("header-admin-name");
    if (headerNameElement) {
      headerNameElement.textContent = adminUser.name || "Admin";
    }
    
    const savedProfilePic = localStorage.getItem("adminProfilePic");
    const profilePic = document.getElementById("admin-profile-pic");
    const profilePlaceholder = document.getElementById("admin-profile-placeholder");
    
    if (savedProfilePic && profilePic && profilePlaceholder) {
      profilePic.src = savedProfilePic;
      profilePic.style.display = "block";
      profilePlaceholder.style.display = "none";
    }
  }
}

function setupProfileUpload() {
  const avatarInput = document.getElementById("admin-avatar-input");
  if (!avatarInput) return;
  
  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      showError("Image size should be less than 2MB");
      e.target.value = "";
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      showError("Please upload a valid image file");
      e.target.value = "";
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target.result;
      localStorage.setItem("adminProfilePic", base64Image);
      
      const profilePic = document.getElementById("admin-profile-pic");
      const profilePlaceholder = document.getElementById("admin-profile-placeholder");
      
      if (profilePic && profilePlaceholder) {
        profilePic.src = base64Image;
        profilePic.style.display = "block";
        profilePlaceholder.style.display = "none";
      }
      
      showSuccessNotification("Profile picture updated successfully!");
    };
    
    reader.onerror = () => {
      showError("Failed to read image file");
      e.target.value = "";
    };
    
    reader.readAsDataURL(file);
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (!logoutBtn) return;
  
  logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("adminUser");
      window.location.href = "admin-login.html";
    }
  });
}

// ============================================================================
// FEEDBACK DELETE FUNCTIONALITY
// ============================================================================
window.confirmDeleteFeedback = async function() {
  if (!pendingDeleteFeedbackId) return;

  try {
    await deleteDoc(doc(db, "feedback", pendingDeleteFeedbackId));
    showSuccessNotification("Feedback deleted successfully!");
    closeFeedbackDeleteModal();
    
    setupRealtimeFeedback();
  } catch (error) {
    console.error("Error deleting feedback:", error);
    showError("Failed to delete feedback");
  }
};

window.openFeedbackDeleteModal = function(feedbackId) {
  pendingDeleteFeedbackId = feedbackId;
  
  let modal = document.getElementById("feedback-delete-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "feedback-delete-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <h3 style="margin-bottom: 16px; color: #f5deb3;">Delete Feedback</h3>
        <p style="margin-bottom: 24px; color: #DEB887;">
          Are you sure you want to delete this feedback? This action cannot be undone.
        </p>
        <div class="modal-actions">
          <button onclick="closeFeedbackDeleteModal()" class="btn-secondary">Cancel</button>
          <button onclick="confirmDeleteFeedback()" class="btn-delete">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  modal.classList.add("active");
};

window.closeFeedbackDeleteModal = function() {
  const modal = document.getElementById("feedback-delete-modal");
  if (modal) {
    modal.classList.remove("active");
  }
  pendingDeleteFeedbackId = null;
};

// ============================================================================
// ADMIN REPLY FUNCTIONALITY
// ============================================================================
window.toggleReplyForm = function(feedbackId) {
  // Close any other open reply forms
  document.querySelectorAll('.admin-reply-form').forEach(form => {
    if (form.dataset.feedbackId !== feedbackId) {
      form.style.display = 'none';
    }
  });

  const replyForm = document.getElementById(`reply-form-${feedbackId}`);
  if (replyForm) {
    const isVisible = replyForm.style.display !== 'none';
    replyForm.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      const textarea = replyForm.querySelector('textarea');
      if (textarea) {
        setTimeout(() => textarea.focus(), 100);
      }
    }
  }
  
  activeReplyFeedbackId = replyForm && replyForm.style.display !== 'none' ? feedbackId : null;
};

window.cancelReply = function(feedbackId) {
  const replyForm = document.getElementById(`reply-form-${feedbackId}`);
  if (replyForm) {
    replyForm.style.display = 'none';
    const textarea = replyForm.querySelector('textarea');
    if (textarea) {
      textarea.value = '';
    }
  }
  activeReplyFeedbackId = null;
};

window.submitAdminReply = async function(feedbackId) {
  const textarea = document.querySelector(`#reply-form-${feedbackId} textarea`);
  const submitBtn = document.querySelector(`#reply-form-${feedbackId} .btn-reply`);
  
  if (!textarea) return;
  
  const replyText = textarea.value.trim();
  
  if (!replyText) {
    showError("Please enter a reply message");
    return;
  }
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
  }
  
  try {
    const adminUser = JSON.parse(localStorage.getItem("adminUser"));
    
    await updateDoc(doc(db, "feedback", feedbackId), {
      adminReply: replyText,
      adminName: adminUser?.name || "Admin",
      repliedAt: new Date(),
      hasAdminReply: true
    });
    
    showSuccessNotification("Reply sent successfully!");
    
    const replyForm = document.getElementById(`reply-form-${feedbackId}`);
    if (replyForm) {
      replyForm.style.display = 'none';
      textarea.value = '';
    }
    
    activeReplyFeedbackId = null;
    
    setupRealtimeFeedback();
    
  } catch (error) {
    console.error("Error submitting reply:", error);
    showError("Failed to send reply. Please try again.");
    
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Reply";
    }
  }
};

// ============================================================================
// DELIVERY NOTIFICATIONS
// ============================================================================
function setupDeliveryNotifications() {
  if (deliveryNotificationsListener) {
    deliveryNotificationsListener();
  }

  let firstLoad = true;

  deliveryNotificationsListener = onSnapshot(
    collection(db, "orders"),
    (snapshot) => {
      if (firstLoad) {
        firstLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const order = { id: change.doc.id, ...change.doc.data() };
          
          if (order.status === "delivered" && !order.adminNotified) {
            showDeliveryNotification(order);
          }
        }
      });
    },
    (error) => {
      console.error("❌ Delivery notifications error:", error);
    }
  );

  console.log("✅ Delivery notifications active");
}

function showDeliveryNotification(order) {
  playNotificationSound();
  
  const notification = document.createElement('div');
  notification.className = 'delivery-notification';
  notification.innerHTML = `
    <div style="display: flex; align-items: start; gap: 16px;">
      <div style="font-size: 48px; animation: bounceIn 0.8s;">📦</div>
      <div style="flex: 1;">
        <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #4CAF50;">
          ✅ Order Delivered Successfully!
        </div>
        <div style="font-size: 14px; margin-bottom: 6px;">
          <strong>Order #${order.id.substring(0, 8)}</strong>
        </div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.9); margin-bottom: 4px;">
          Customer: ${escapeHtml(order.fullName || 'Unknown')}
        </div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.9); margin-bottom: 4px;">
          Rider: ${escapeHtml(order.riderName || 'Unknown')}
        </div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.9);">
          Total: ₱${(order.total || 0).toFixed(2)}
        </div>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button onclick="window.location.href='admin-orders.html'" 
                  style="padding: 8px 16px; background: rgba(255,255,255,0.2); 
                         border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 6px; 
                         cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s;">
            View Orders
          </button>
          <button onclick="this.closest('.delivery-notification').remove();" 
                  style="padding: 8px 16px; background: rgba(255,255,255,0.2); 
                         border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 6px; 
                         cursor: pointer; font-weight: 600; font-size: 12px;">
            Dismiss
          </button>
        </div>
      </div>
      <button onclick="this.closest('.delivery-notification').remove();" 
              style="background: none; border: none; color: white; font-size: 24px; 
                     cursor: pointer; opacity: 0.7; padding: 0; line-height: 1;">
        ×
      </button>
    </div>
  `;
  
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 24px;
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(76, 175, 80, 0.4);
    z-index: 10001;
    animation: slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    max-width: 400px;
    border: 2px solid rgba(255,255,255,0.2);
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.remove();
        }
      }, 300);
    }
  }, 15000);
}

function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi1+zPDTfS8GJHzM8OeLNgkXbL3q7Kj/');
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch (e) {
    console.warn('Could not play sound:', e);
  }
}

// ============================================================================
// REAL-TIME DASHBOARD UPDATES
// ============================================================================
function setupRealtimeDashboard() {
  if (dashboardListener) {
    dashboardListener();
  }

  dashboardListener = onSnapshot(
    collection(db, "orders"),
    (ordersSnapshot) => {
      console.log("📊 Dashboard real-time update triggered");
      loadDashboardStats(ordersSnapshot);
      createBestSellersChart(ordersSnapshot);
      console.log("✅ Dashboard updated in real-time");
    },
    (error) => {
      console.error("❌ Dashboard listener error:", error);
      loadDashboardStatsOnce();
    }
  );
}

// ============================================================================
// REAL-TIME RIDERS COUNT
// ============================================================================
function setupRealtimeRiders() {
  if (ridersListener) {
    ridersListener();
  }

  ridersListener = onSnapshot(
    collection(db, "riders"),
    (ridersSnapshot) => {
      console.log("🛵 Riders real-time update triggered");
      
      const totalRiders = ridersSnapshot.size;
      let activeRiders = 0;
      
      ridersSnapshot.forEach((doc) => {
        const rider = doc.data();
        if (rider.status === "online" || rider.isOnline) {
          activeRiders++;
        }
      });
      
      const ridersElement = document.getElementById("total-riders");
      if (ridersElement) {
        ridersElement.textContent = totalRiders;
        ridersElement.title = `${activeRiders} active / ${totalRiders} total riders`;
      }
      
      console.log(`✅ Riders: ${activeRiders} active / ${totalRiders} total`);
    },
    (error) => {
      console.error("❌ Riders listener error:", error);
      loadRidersCountOnce();
    }
  );
}

// ============================================================================
// REAL-TIME FEEDBACK UPDATES
// ============================================================================
function setupRealtimeFeedback() {
  if (feedbackListener) {
    feedbackListener();
  }

  try {
    const feedbackQuery = query(
      collection(db, "feedback"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    feedbackListener = onSnapshot(
      feedbackQuery,
      (feedbackSnapshot) => {
        console.log("⭐ Feedback real-time update triggered");
        loadRecentFeedback(feedbackSnapshot);
      },
      (error) => {
        console.error("❌ Feedback listener error (trying fallback):", error);
        setupFeedbackFallback();
      }
    );
  } catch (error) {
    console.error("❌ Failed to setup feedback listener:", error);
    setupFeedbackFallback();
  }
}

function setupFeedbackFallback() {
  if (feedbackListener) {
    feedbackListener();
  }
  
  feedbackListener = onSnapshot(
    collection(db, "feedback"),
    (feedbackSnapshot) => {
      console.log("⭐ Feedback real-time update (fallback mode)");
      
      const feedbackData = [];
      feedbackSnapshot.forEach((doc) => {
        const data = doc.data();
        feedbackData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || 0)
        });
      });
      
      feedbackData.sort((a, b) => b.createdAt - a.createdAt);
      const recentFeedback = feedbackData.slice(0, 5);
      
      displayFeedback(recentFeedback);
    },
    (error) => {
      console.error("❌ Feedback fallback error:", error);
      loadRecentFeedbackOnce();
    }
  );
}

// ============================================================================
// LOAD RECENT FEEDBACK FROM SNAPSHOT
// ============================================================================
function loadRecentFeedback(feedbackSnapshot) {
  if (feedbackSnapshot.empty) {
    showEmptyFeedback();
    return;
  }

  const feedbackData = [];
  feedbackSnapshot.forEach((doc) => {
    const data = doc.data();
    feedbackData.push({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || 0)
    });
  });

  displayFeedback(feedbackData);
}

// ============================================================================
// DISPLAY FEEDBACK IN UI WITH DELETE & REPLY BUTTONS
// ============================================================================
function displayFeedback(feedbackData) {
  const feedbackContainer = document.getElementById("recent-feedback");
  if (!feedbackContainer) return;

  if (feedbackData.length === 0) {
    showEmptyFeedback();
    return;
  }

  feedbackContainer.innerHTML = feedbackData
    .map((feedback) => {
      const stars = '⭐'.repeat(feedback.rating || 0);
      const createdAt = feedback.createdAt;
      
      const adminReplySection = feedback.adminReply ? `
        <div class="admin-reply-section">
          <div class="admin-reply-header">
            <span>👨‍💼</span>
            <span>${escapeHtml(feedback.adminName || 'Admin')} replied:</span>
          </div>
          <div class="admin-reply-text">${escapeHtml(feedback.adminReply)}</div>
        </div>
      ` : '';

      return `
        <div class="feedback-item">
          <div class="feedback-actions">
            <button 
              onclick="toggleReplyForm('${feedback.id}')" 
              class="feedback-action-btn chat-btn"
              title="Reply to feedback">
              💬
            </button>
            <button 
              onclick="openFeedbackDeleteModal('${feedback.id}')" 
              class="feedback-action-btn delete-btn"
              title="Delete feedback">
              ×
            </button>
          </div>
          
          <div class="feedback-header">
            <div class="feedback-info">
              <div class="feedback-customer">${escapeHtml(feedback.userEmail || 'Anonymous')}</div>
              <div class="feedback-order">Order #${feedback.orderId?.substring(0, 8) || 'Unknown'}</div>
            </div>
            <div class="feedback-rating" title="${feedback.rating || 0} stars">
              ${stars}
            </div>
          </div>
          
          ${feedback.comment ? `
            <div class="feedback-comment">
              "${escapeHtml(feedback.comment)}"
            </div>
          ` : ''}
          
          ${adminReplySection}
          
          <div class="admin-reply-form" id="reply-form-${feedback.id}" style="display: none;" data-feedback-id="${feedback.id}">
            <textarea placeholder="Type your reply to the customer..."></textarea>
            <div class="admin-reply-form-actions">
              <button onclick="cancelReply('${feedback.id}')" class="btn-cancel">Cancel</button>
              <button onclick="submitAdminReply('${feedback.id}')" class="btn-reply">Send Reply</button>
            </div>
          </div>
          
          <div class="feedback-date">${createdAt.toLocaleDateString()} at ${createdAt.toLocaleTimeString()}</div>
        </div>
      `;
    })
    .join("");
}

function showEmptyFeedback() {
  const feedbackContainer = document.getElementById("recent-feedback");
  if (!feedbackContainer) return;
  
  feedbackContainer.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #999;">
      <div style="font-size: 48px; margin-bottom: 16px;">⭐</div>
      <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">No feedback yet</div>
      <div style="font-size: 14px;">Customer reviews will appear here</div>
    </div>
  `;
}

// ============================================================================
// LOAD RECENT FEEDBACK ONCE (FALLBACK)
// ============================================================================
async function loadRecentFeedbackOnce() {
  try {
    console.log("📋 Loading recent feedback (fallback mode)...");
    const feedbackSnapshot = await getDocs(collection(db, "feedback"));
    
    const feedbackData = [];
    feedbackSnapshot.forEach((doc) => {
      const data = doc.data();
      feedbackData.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || 0)
      });
    });

    feedbackData.sort((a, b) => b.createdAt - a.createdAt);
    const recentFeedback = feedbackData.slice(0, 5);
    
    displayFeedback(recentFeedback);
    console.log("✅ Recent feedback loaded");
  } catch (error) {
    console.error("❌ Error loading feedback:", error);
    const feedbackContainer = document.getElementById("recent-feedback");
    if (feedbackContainer) {
      feedbackContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
          <div style="font-size: 16px;">Failed to load feedback</div>
        </div>
      `;
    }
  }
}

// ============================================================================
// LOAD RIDERS COUNT ONCE (FALLBACK)
// ============================================================================
async function loadRidersCountOnce() {
  try {
    const ridersSnapshot = await getDocs(collection(db, "riders"));
    const totalRiders = ridersSnapshot.size;
    let activeRiders = 0;
    
    ridersSnapshot.forEach((doc) => {
      const rider = doc.data();
      if (rider.status === "online" || rider.isOnline) {
        activeRiders++;
      }
    });
    
    const ridersElement = document.getElementById("total-riders");
    if (ridersElement) {
      ridersElement.textContent = totalRiders;
      ridersElement.title = `${activeRiders} active / ${totalRiders} total riders`;
    }
    
    console.log(`✅ Riders loaded: ${activeRiders} active / ${totalRiders} total`);
  } catch (error) {
    console.error("❌ Error loading riders count:", error);
    const ridersElement = document.getElementById("total-riders");
    if (ridersElement) {
      ridersElement.textContent = "0";
    }
  }
}

// ============================================================================
// LOAD DASHBOARD STATISTICS
// ============================================================================
function loadDashboardStats(ordersSnapshot) {
  try {
    console.log(`📋 Processing ${ordersSnapshot.size} orders`);
    
    const totalOrdersElement = document.getElementById("total-orders");
    if (totalOrdersElement) {
      totalOrdersElement.textContent = ordersSnapshot.size;
    }

    let totalRevenue = 0;
    ordersSnapshot.forEach((doc) => {
      const order = doc.data();
      if (order.status !== "cancelled") {
        totalRevenue += order.total || 0;
      }
    });
    
    const revenueElement = document.getElementById("total-revenue");
    if (revenueElement) {
      revenueElement.textContent = `₱${totalRevenue.toFixed(2)}`;
    }

    loadRecentOrders(ordersSnapshot);
    loadOrderStatus(ordersSnapshot);
    loadUsersAndProducts();
    
    console.log("✅ Dashboard stats loaded successfully");
  } catch (error) {
    console.error("❌ Error loading dashboard stats:", error);
    showError("Failed to load dashboard statistics");
  }
}

// ============================================================================
// LOAD DASHBOARD STATISTICS ONCE (FALLBACK)
// ============================================================================
async function loadDashboardStatsOnce() {
  try {
    console.log("📋 Loading dashboard stats (fallback mode)...");
    const ordersSnapshot = await getDocs(collection(db, "orders"));
    loadDashboardStats(ordersSnapshot);
    createBestSellersChart(ordersSnapshot);
  } catch (error) {
    console.error("❌ Error loading dashboard:", error);
    showError("Failed to load dashboard data. Please refresh the page.");
  }
}

// ============================================================================
// LOAD USERS AND PRODUCTS COUNT
// ============================================================================
async function loadUsersAndProducts() {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersElement = document.getElementById("total-users");
    if (usersElement) {
      usersElement.textContent = usersSnapshot.size;
    }

    const productsSnapshot = await getDocs(collection(db, "products"));
    const productsElement = document.getElementById("total-products");
    if (productsElement) {
      productsElement.textContent = productsSnapshot.size;
    }
    
    console.log(`✅ Loaded ${usersSnapshot.size} users and ${productsSnapshot.size} products`);
  } catch (error) {
    console.error("❌ Error loading users/products:", error);
  }
}

// ============================================================================
// CREATE BEST SELLERS CHART
// ============================================================================
async function createBestSellersChart(ordersSnapshot) {
  try {
    const productsSnapshot = await getDocs(collection(db, "products"));
    const productsMap = new Map();
    productsSnapshot.forEach((doc) => {
      const product = doc.data();
      productsMap.set(doc.id, {
        name: product.name || 'Unknown Product',
        sales: 0
      });
    });

    ordersSnapshot.forEach((doc) => {
      const order = doc.data();
      if (order.status !== "cancelled" && order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          if (productsMap.has(item.id)) {
            const product = productsMap.get(item.id);
            product.sales += item.quantity || 0;
          }
        });
      }
    });

    const salesData = Array.from(productsMap.values())
      .filter(p => p.sales > 0)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    const chartContainer = document.querySelector('.chart-container');
    
    if (salesData.length === 0) {
      chartContainer.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #999;">
          <div style="font-size: 64px; margin-bottom: 16px;">📊</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No sales data yet</div>
          <div style="font-size: 14px;">Sales statistics will appear here once orders are completed</div>
        </div>
      `;
      return;
    }

    const labels = salesData.map(p => p.name);
    const data = salesData.map(p => p.sales);

    const colors = [
      'rgba(222, 184, 135, 0.9)',
      'rgba(210, 105, 30, 0.9)',
      'rgba(244, 164, 96, 0.9)',
      'rgba(205, 133, 63, 0.9)',
      'rgba(188, 143, 143, 0.9)'
    ];

    const borderColors = [
      'rgba(222, 184, 135, 1)',
      'rgba(210, 105, 30, 1)',
      'rgba(244, 164, 96, 1)',
      'rgba(205, 133, 63, 1)',
      'rgba(188, 143, 143, 1)'
    ];

    const ctx = document.getElementById('bestSellersChart');
    if (!ctx) return;

    if (bestSellersChart) {
      bestSellersChart.destroy();
    }

    bestSellersChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          label: 'Units Sold',
          data: data,
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 3,
          hoverOffset: 20
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#f5deb3',
              font: {
                size: 14,
                weight: '600'
              },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(61, 40, 23, 0.95)',
            titleColor: '#f5deb3',
            bodyColor: '#DEB887',
            borderColor: 'rgba(222, 184, 135, 0.5)',
            borderWidth: 2,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const sales = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((sales / total) * 100).toFixed(1);
                return [
                  `Units Sold: ${sales}`,
                  `Percentage: ${percentage}%`
                ];
              }
            }
          }
        },
        cutout: '65%',
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1500,
          easing: 'easeInOutQuart'
        }
      }
    });

    console.log("✅ Best sellers chart created");
  } catch (error) {
    console.error("❌ Error creating chart:", error);
  }
}

// ============================================================================
// LOAD RECENT ORDERS
// ============================================================================
function loadRecentOrders(ordersSnapshot) {
  const recentOrdersContainer = document.getElementById("recent-orders");
  if (!recentOrdersContainer) return;
  
  const orders = [];

  ordersSnapshot.forEach((doc) => {
    const data = doc.data();
    orders.push({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
    });
  });

  orders.sort((a, b) => b.createdAt - a.createdAt);
  const recentOrders = orders.slice(0, 5);

  if (recentOrders.length === 0) {
    recentOrdersContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #999;">
        <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">No orders yet</div>
        <div style="font-size: 14px;">Orders will appear here when customers place them</div>
      </div>
    `;
    return;
  }

  recentOrdersContainer.innerHTML = recentOrders
    .map(order => `
      <div class="order-item">
        <div class="order-header">
          <strong>Order #${order.id.substring(0, 8)}</strong>
          <span class="status-badge status-${order.status}">${getStatusLabel(order.status)}</span>
        </div>
        <p style="font-size: 14px; color: #DEB887; margin: 4px 0;">
          ${escapeHtml(order.fullName || 'Unknown')} - ₱${(order.total || 0).toFixed(2)}
        </p>
        <p style="font-size: 12px; color: #999;">
          ${order.createdAt.toLocaleDateString()}
        </p>
      </div>
    `)
    .join("");
}

// ============================================================================
// GET READABLE STATUS LABELS
// ============================================================================
function getStatusLabel(status) {
  const labels = {
    'pending': 'PENDING',
    'processing': 'PROCESSING',
    'ready': 'READY',
    'assigned': 'ASSIGNED',
    'picked_up': 'PICKED UP',
    'in_transit': 'IN TRANSIT',
    'delivered': 'DELIVERED',
    'done': 'COMPLETED',
    'cancelled': 'CANCELLED'
  };
  return labels[status] || status.toUpperCase();
}

// ============================================================================
// LOAD ORDER STATUS COUNTS
// ============================================================================
function loadOrderStatus(ordersSnapshot) {
  const statusContainer = document.getElementById("order-status");
  if (!statusContainer) return;

  const statusCounts = {
    pending: 0,
    processing: 0,
    delivery: 0,
    done: 0,
    cancelled: 0
  };

  ordersSnapshot.forEach((doc) => {
    const order = doc.data();
    const status = order.status;

    if (status === 'pending') {
      statusCounts.pending++;
    } else if (status === 'processing' || status === 'ready') {
      statusCounts.processing++;
    } else if (status === 'assigned' || status === 'picked_up' || status === 'in_transit') {
      statusCounts.delivery++;
    } else if (status === 'delivered' || status === 'done') {
      statusCounts.done++;
    } else if (status === 'cancelled') {
      statusCounts.cancelled++;
    }
  });

  statusContainer.innerHTML = `
    <div class="status-count">
      <span>Pending</span>
      <strong>${statusCounts.pending}</strong>
    </div>
    <div class="status-count">
      <span>Processing</span>
      <strong>${statusCounts.processing}</strong>
    </div>
    <div class="status-count">
      <span>Delivery</span>
      <strong>${statusCounts.delivery}</strong>
    </div>
    <div class="status-count">
      <span>Done</span>
      <strong>${statusCounts.done}</strong>
    </div>
    <div class="status-count">
      <span>Cancelled</span>
      <strong>${statusCounts.cancelled}</strong>
    </div>
  `;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================
function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    font-weight: 600;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

function showError(message) {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 24px;">⚠️</span>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Error</div>
        <div style="font-size: 14px;">${escapeHtml(message)}</div>
      </div>
    </div>
  `;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 20px;
    background: linear-gradient(135deg, #f44336, #d32f2f);
    color: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// ============================================================================
// CLEANUP ON PAGE UNLOAD
// ============================================================================
window.addEventListener('beforeunload', () => {
  if (dashboardListener) {
    dashboardListener();
    console.log("✅ Dashboard listener cleaned up");
  }
  if (ridersListener) {
    ridersListener();
    console.log("✅ Riders listener cleaned up");
  }
  if (deliveryNotificationsListener) {
    deliveryNotificationsListener();
    console.log("✅ Delivery notifications listener cleaned up");
  }
  if (feedbackListener) {
    feedbackListener();
    console.log("✅ Feedback listener cleaned up");
  }
  if (bestSellersChart) {
    bestSellersChart.destroy();
    console.log("✅ Chart cleaned up");
  }
});

// ============================================================================
// INITIALIZE DASHBOARD
// ============================================================================
console.log("🚀 Initializing Admin Dashboard...");

loadAdminProfile();
setupProfileUpload();
setupLogout();

try {
  setupRealtimeDashboard();
  setupRealtimeRiders();
  setupRealtimeFeedback();
  setupDeliveryNotifications();
  console.log("✅ Admin Dashboard Ready");
  console.log("✅ Real-time Updates Active");
  console.log("✅ Delivery Notifications Active");
  console.log("✅ Feedback Display Active with Reply & Delete");
} catch (error) {
  console.error("❌ Failed to setup real-time updates:", error);
  loadDashboardStatsOnce();
  loadRidersCountOnce();
  loadRecentFeedbackOnce();
}
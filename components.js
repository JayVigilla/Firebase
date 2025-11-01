// Shared Components - Header, Footer, Breadcrumb

// Add CSS for the enhanced navigation
const componentStyles = `
<style>
  .nav-menu {
    position: relative;
  }

  .nav-menu ul {
    display: flex;
    gap: 1rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .nav-menu li {
    position: relative;
  }

  .nav-menu a {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    border-radius: 8px;
    white-space: nowrap;
  }

  .nav-menu a:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .nav-icon {
    font-size: 1.2rem;
    transition: transform 0.3s ease;
  }

  .nav-label {
    font-size: 0.9rem;
    font-weight: 500;
    opacity: 0;
    max-width: 0;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .nav-menu.expanded .nav-label {
    opacity: 1;
    max-width: 100px;
  }

  .nav-menu.expanded .nav-icon {
    transform: scale(1.1);
  }

  .nav-toggle-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-toggle-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
    transform: rotate(180deg);
  }

  .feedback-icon {
    position: relative;
    cursor: pointer;
    font-size: 1.5rem;
    padding: 0.5rem;
    transition: transform 0.2s;
  }

  .feedback-icon:hover {
    transform: scale(1.1);
  }

  .feedback-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ff4757;
    color: white;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: bold;
  }

  @media (max-width: 768px) {
    .nav-menu ul {
      gap: 0.5rem;
    }

    .nav-menu a {
      padding: 0.4rem 0.8rem;
    }

    .nav-label {
      font-size: 0.8rem;
    }
  }
</style>
`;

export function renderHeader() {
  const user = JSON.parse(localStorage.getItem("currentUser"))
  const cartCount = JSON.parse(localStorage.getItem("cart") || "[]").length
  
  // Count user's feedback submissions
  let feedbackCount = 0
  try {
    const orders = JSON.parse(localStorage.getItem("orders") || "[]")
    const userOrders = orders.filter(order => order.userId === user?.uid || order.userId === user?.id)
    feedbackCount = userOrders.filter(order => order.hasFeedback).length
  } catch (e) {
    console.error("Error counting feedback:", e)
  }

  return `
    ${componentStyles}
    <header class="header">
      <div class="header-top">
        <p>🌸 Discount on Orders Over ₱1000 🌸</p>
      </div>
      <div class="header-main">
        <a href="index.html" class="logo">🎂💐 Bouquet & Cake</a>
        
        <div class="search-bar">
          <input type="text" placeholder="Search for cakes, bouquets..." id="search-input">
          <button onclick="performSearch()">Search</button>
        </div>
        
        <div class="header-actions">
          ${user ? `
          <!-- Feedback Icon -->
          <div class="feedback-icon" onclick="window.location.href='feedback-history.html'" title="My Feedback">
            <span class="icon-star">⭐</span>
            ${feedbackCount > 0 ? `<span class="feedback-badge">${feedbackCount}</span>` : ""}
          </div>
          ` : ''}
          
          <div class="cart-icon" onclick="window.location.href='cart.html'">
            🛒
            ${cartCount > 0 ? `<span class="cart-badge">${cartCount}</span>` : ""}
          </div>
          
          <div class="profile-dropdown">
            <div class="profile-icon" onclick="toggleProfileDropdown()">
              👤
            </div>
            <div class="dropdown-menu" id="profile-dropdown">
              ${
                user
                  ? `
                <a href="profile.html" class="dropdown-item">
                  <span class="dropdown-icon">👤</span>
                  <span>My Profile</span>
                </a>
                <a href="order-tracking.html" class="dropdown-item">
                  <span class="dropdown-icon">📦</span>
                  <span>Track Orders</span>
                </a>
                <a href="feedback-history.html" class="dropdown-item feedback-link">
                  <span class="dropdown-icon">⭐</span>
                  <span>My Feedback</span>
                </a>
                <button onclick="handleLogout()" class="dropdown-item logout">
                  <span class="dropdown-icon">🚪</span>
                  <span>Logout</span>
                </button>
              `
                  : `
                <a href="login.html" class="dropdown-item">
                  <span class="dropdown-icon">🔑</span>
                  <span>Login</span>
                </a>
                <a href="register.html" class="dropdown-item">
                  <span class="dropdown-icon">📝</span>
                  <span>Register</span>
                </a>
              `
              }
            </div>
          </div>
        </div>
      </div>
      <nav class="nav-menu" id="nav-menu">
        <ul>
          <li>
            <a href="index.html">
              <span class="nav-icon">🏡</span>
              <span class="nav-label">Home</span>
            </a>
          </li>
          <li>
            <a href="shop.html">
              <span class="nav-icon">🛒</span>
              <span class="nav-label">Shop</span>
            </a>
          </li>
          <li>
            <a href="contact.html">
              <span class="nav-icon">💬</span>
              <span class="nav-label">Contact</span>
            </a>
          </li>
          ${user ? `
          <li>
            <a href="profile.html">
              <span class="nav-icon">👥</span>
              <span class="nav-label">Profile</span>
            </a>
          </li>
          ` : ""}
          <li>
            <button class="nav-toggle-btn" onclick="toggleNavLabels()" title="Toggle labels">
              ⚙️
            </button>
          </li>
        </ul>
      </nav>
    </header>
  `
}

export function renderBreadcrumb(items) {
  return `
    <nav class="breadcrumb">
      <ul class="breadcrumb-list">
        ${items
          .map(
            (item) => `
          <li>
            ${item.link ? `<a href="${item.link}">${item.label}</a>` : item.label}
          </li>
        `,
          )
          .join("")}
      </ul>
    </nav>
  `
}

export function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-section">
          <h3>About Us</h3>
          <p>Your trusted source for beautiful cakes and fresh bouquets for every occasion.</p>
        </div>
        <div class="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="index.html">🏡-Home</a></li>
            <li><a href="shop.html">🛒-Shop</a></li>
            <li><a href="contact.html">💬-Contact</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h3>Contact</h3>
          <p>Email: Jayknightvigilla@gmail.com</p>
          <p>Phone: +63 9212 697 632</p>
        </div>
        <div class="footer-section">
          <h3>Follow Us</h3>
          <div class="social-links">
            <a href="https://www.facebook.com/sky.vigilla" target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href="https://www.instagram.com/vigillajay" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://www.tiktok.com/@sky.vigilla?_t=ZS-90sszBicQsa&_r=1" target="_blank" rel="noopener noreferrer">TikTok</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2025 Florist & Cake Shop. All rights reserved.</p>
      </div>
    </footer>
  `
}

// Initialize components on page load
document.addEventListener("DOMContentLoaded", () => {
  const headerContainer = document.getElementById("header-container")
  const footerContainer = document.getElementById("footer-container")

  if (headerContainer) {
    headerContainer.innerHTML = renderHeader()
  }

  if (footerContainer) {
    footerContainer.innerHTML = renderFooter()
  }

  // Check if labels should be shown on page load
  const navExpanded = localStorage.getItem("navExpanded") === "true"
  if (navExpanded) {
    const navMenu = document.getElementById("nav-menu")
    if (navMenu) {
      navMenu.classList.add("expanded")
    }
  }
})

// Global functions
window.toggleProfileDropdown = () => {
  const dropdown = document.getElementById("profile-dropdown")
  dropdown.classList.toggle("active")
}

window.toggleNavLabels = () => {
  const navMenu = document.getElementById("nav-menu")
  navMenu.classList.toggle("expanded")
  
  // Save state to localStorage
  const isExpanded = navMenu.classList.contains("expanded")
  localStorage.setItem("navExpanded", isExpanded)
}

window.handleLogout = async () => {
  try {
    const { signOut, auth } = await import("./firebase-config.js")
    await signOut(auth)
    localStorage.removeItem("currentUser")
    window.location.href = "index.html"
  } catch (error) {
    console.error("Logout error:", error)
  }
}

window.performSearch = () => {
  const searchInput = document.getElementById("search-input")
  const searchTerm = searchInput.value.trim()
  if (searchTerm) {
    window.location.href = `shop.html?search=${encodeURIComponent(searchTerm)}`
  }
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  const dropdown = document.getElementById("profile-dropdown")
  const profileIcon = document.querySelector(".profile-icon")

  if (dropdown && profileIcon && !profileIcon.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.remove("active")
  }
})
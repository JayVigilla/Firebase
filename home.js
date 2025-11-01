import { renderBreadcrumb } from "./components.js"
import { db, collection, getDocs, query, limit } from "./firebase-config.js"

// Carousel functionality
let currentSlide = 0
const slides = document.querySelectorAll(".carousel-slide")
const indicators = document.querySelectorAll(".indicator")
const totalSlides = slides.length

function showSlide(index) {
  slides.forEach((slide) => slide.classList.remove("active"))
  indicators.forEach((indicator) => indicator.classList.remove("active"))
  
  slides[index].classList.add("active")
  if (indicators[index]) {
    indicators[index].classList.add("active")
  }
}

window.changeSlide = (direction) => {
  currentSlide = (currentSlide + direction + totalSlides) % totalSlides
  showSlide(currentSlide)
}

window.goToSlide = (index) => {
  currentSlide = index
  showSlide(currentSlide)
}

// Auto-rotate carousel every 5 seconds
let autoPlayInterval = setInterval(() => {
  currentSlide = (currentSlide + 1) % totalSlides
  showSlide(currentSlide)
}, 5000)

// Pause auto-play on hover
const carouselContainer = document.querySelector(".hero-carousel")
if (carouselContainer) {
  carouselContainer.addEventListener("mouseenter", () => {
    clearInterval(autoPlayInterval)
  })

  carouselContainer.addEventListener("mouseleave", () => {
    autoPlayInterval = setInterval(() => {
      currentSlide = (currentSlide + 1) % totalSlides
      showSlide(currentSlide)
    }, 5000)
  })
}

// Render breadcrumb
const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer) {
  breadcrumbContainer.innerHTML = renderBreadcrumb([{ label: "Home", link: null }])
}

// Load featured products
async function loadFeaturedProducts() {
  try {
    const productsRef = collection(db, "products")
    // Changed from limit(6) to limit(100) to show all 100 products
    const q = query(productsRef, limit(100))
    const querySnapshot = await getDocs(q)

    const featuredContainer = document.getElementById("featured-products")

    if (querySnapshot.empty) {
      featuredContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <p style="font-size: 1.2rem; color: #666;">No products available yet.</p>
          <p style="color: #999; margin-top: 0.5rem;">Check back soon for amazing products!</p>
        </div>
      `
      return
    }

    featuredContainer.innerHTML = ""
    querySnapshot.forEach((doc) => {
      const product = doc.data()
      const productCard = createProductCard({ id: doc.id, ...product })
      featuredContainer.innerHTML += productCard
    })
    
    // Add animation to product cards
    animateProducts()
  } catch (error) {
    console.error("Error loading products:", error)
    const featuredContainer = document.getElementById("featured-products")
    featuredContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <p style="font-size: 1.2rem; color: #ff4da6;">Unable to load products at this time.</p>
        <p style="color: #999; margin-top: 0.5rem;">Please try again later.</p>
      </div>
    `
  }
}

function createProductCard(product) {
  return `
    <div class="product-card" onclick="window.location.href='product-detail.html?id=${product.id}'" style="animation: fadeInUp 0.6s ease-out forwards; opacity: 0;">
      <img src="${product.image || "/placeholder.svg?height=280&width=300"}" alt="${product.name}" class="product-image">
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-price">₱${product.price.toFixed(2)}</p>
        <p class="product-description">${product.description ? product.description.substring(0, 80) + '...' : 'No description available'}</p>
        <button class="btn-primary" onclick="event.stopPropagation(); addToCart('${product.id}')">Add to Cart</button>
      </div>
    </div>
  `
}

function animateProducts() {
  const productCards = document.querySelectorAll('.product-card')
  productCards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = '1'
    }, index * 100)
  })
}

window.addToCart = (productId) => {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]")
  const existingItem = cart.find((item) => item.productId === productId)

  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.push({ productId, quantity: 1 })
  }

  localStorage.setItem("cart", JSON.stringify(cart))
  
  // Show success notification
  showNotification("Product added to cart! 🎉")
  
  // Update cart badge if exists
  updateCartBadge()
}

function showNotification(message) {
  // Remove any existing notifications
  const existingNotification = document.querySelector('.toast-notification')
  if (existingNotification) {
    existingNotification.remove()
  }

  const notification = document.createElement('div')
  notification.className = 'toast-notification'
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: linear-gradient(135deg, #ff69b4, #ff1493);
    color: white;
    padding: 1rem 2rem;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(255, 105, 180, 0.4);
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `
  notification.textContent = message
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out'
    setTimeout(() => notification.remove(), 300)
  }, 3000)
}

function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]")
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  
  const cartBadge = document.querySelector('.cart-badge')
  if (cartBadge) {
    cartBadge.textContent = totalItems
    if (totalItems > 0) {
      cartBadge.style.display = 'flex'
    } else {
      cartBadge.style.display = 'none'
    }
  }
}

// Add CSS animations dynamically
const style = document.createElement('style')
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedProducts()
  updateCartBadge()
})

// Also run immediately in case DOMContentLoaded already fired
loadFeaturedProducts()
updateCartBadge()
import { renderBreadcrumb } from "./components.js"
import { db, collection, getDocs } from "./firebase-config.js"

// Render breadcrumb
const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer) {
  breadcrumbContainer.innerHTML = renderBreadcrumb([
    { label: "Home", link: "index.html" },
    { label: "Shop", link: null },
  ])
}

let allProducts = []

// Load products from Firestore
async function loadProducts() {
  try {
    const productsRef = collection(db, "products")
    const querySnapshot = await getDocs(productsRef)

    allProducts = []
    querySnapshot.forEach((doc) => {
      allProducts.push({ id: doc.id, ...doc.data() })
    })

    // If no products in Firestore, use sample data
    if (allProducts.length === 0) {
      allProducts = getSampleProducts()
    }

    displayProducts(allProducts)
  } catch (error) {
    console.error("Error loading products:", error)
    // Use sample data on error
    allProducts = getSampleProducts()
    displayProducts(allProducts)
  }
}

// Sample products with base64 placeholder images
function getSampleProducts() {
  return [
    {
      id: "1",
      name: "Chocolate Dream Cake",
      price: 850,
      category: "cake",
      description: "Rich chocolate cake with creamy frosting, perfect for celebrations",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23D2691E' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3EChocolate Cake%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23D2691E' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3EChocolate Cake%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%238B4513' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3EChocolate Detail%3C/text%3E%3C/svg%3E",
      ],
    },
    {
      id: "2",
      name: "Strawberry Delight",
      price: 950,
      category: "cake",
      description: "Fresh strawberry cake with vanilla cream, light and delicious",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFB6C1' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23FF1493' text-anchor='middle' dy='.3em'%3EStrawberry Cake%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFB6C1' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23FF1493' text-anchor='middle' dy='.3em'%3EStrawberry Cake%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF69B4' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3EStrawberry Detail%3C/text%3E%3C/svg%3E",
      ],
    },
    {
      id: "3",
      name: "Vanilla Classic",
      price: 750,
      category: "cake",
      description: "Traditional vanilla cake with buttercream frosting",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFFACD' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23DAA520' text-anchor='middle' dy='.3em'%3EVanilla Cake%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFFACD' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23DAA520' text-anchor='middle' dy='.3em'%3EVanilla Cake%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23F0E68C' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23DAA520' text-anchor='middle' dy='.3em'%3EVanilla Detail%3C/text%3E%3C/svg%3E",
      ],
    },
    {
      id: "4",
      name: "Rose Bouquet",
      price: 1200,
      category: "bouquet",
      description: "Beautiful arrangement of fresh red roses, perfect for romance",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF0000' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3ERose Bouquet%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF0000' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3ERose Bouquet%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23DC143C' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3ERose Detail%3C/text%3E%3C/svg%3E",
      ],
    },
    {
      id: "5",
      name: "Tulip Garden",
      price: 1100,
      category: "bouquet",
      description: "Colorful tulip arrangement bringing spring to your home",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF69B4' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3ETulip Bouquet%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF69B4' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dy='.3em'%3ETulip Bouquet%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FF1493' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3ETulip Detail%3C/text%3E%3C/svg%3E",
      ],
    },
    {
      id: "6",
      name: "Sunflower Sunshine",
      price: 900,
      category: "bouquet",
      description: "Bright sunflowers to brighten any day",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFD700' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23FF8C00' text-anchor='middle' dy='.3em'%3ESunflower Bouquet%3C/text%3E%3C/svg%3E",
      images: [
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFD700' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23FF8C00' text-anchor='middle' dy='.3em'%3ESunflower Bouquet%3C/text%3E%3C/svg%3E",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23FFA500' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3ESunflower Detail%3C/text%3E%3C/svg%3E",
      ],
    },
  ]
}

// Display products
function displayProducts(products) {
  const container = document.getElementById("products-container")
  const emptyState = document.getElementById("empty-state")

  if (products.length === 0) {
    container.innerHTML = ""
    if (emptyState) {
      emptyState.style.display = "block"
    }
    return
  }

  if (emptyState) {
    emptyState.style.display = "none"
  }

  container.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" onclick="window.location.href='product-detail.html?id=${product.id}'">
      <img src="${product.image}" alt="${product.name}" class="product-image">
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-price">₱${product.price.toFixed(2)}</p>
        <p class="product-description">${product.description.substring(0, 60)}...</p>
        <button class="btn-primary" onclick="event.stopPropagation(); addToCart('${product.id}')">Add to Cart</button>
      </div>
    </div>
  `,
    )
    .join("")
}

// Filter and sort functionality
function filterProducts() {
  const searchTerm = document.getElementById("search-input").value.toLowerCase().trim()
  const category = document.getElementById("category-filter").value
  const sortBy = document.getElementById("sort-filter").value

  let filtered = [...allProducts]

  console.log('Search term:', searchTerm)
  console.log('Total products:', filtered.length)

  // Filter by search term - ONLY search in name and description
  if (searchTerm && searchTerm.length > 0) {
    filtered = filtered.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(searchTerm)
      const descMatch = p.description.toLowerCase().includes(searchTerm)
      const categoryMatch = p.category.toLowerCase().includes(searchTerm)
      const matches = nameMatch || descMatch || categoryMatch
      
      // Debug logging
      console.log(`Product: ${p.name}, Category: ${p.category}, Matches: ${matches}`)
      
      return matches
    })
  }

  console.log('Filtered products:', filtered.length)

  // Filter by category
  if (category !== "all") {
    filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase())
  }

  // Sort
  if (sortBy === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortBy === "price-low") {
    filtered.sort((a, b) => a.price - b.price)
  } else if (sortBy === "price-high") {
    filtered.sort((a, b) => b.price - a.price)
  }

  displayProducts(filtered)
}

// Add event listeners for filters
document.getElementById("category-filter").addEventListener("change", filterProducts)
document.getElementById("sort-filter").addEventListener("change", filterProducts)

// Add search functionality with debounce
let searchTimeout
document.getElementById("search-input").addEventListener("input", function() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    filterProducts()
  }, 300)
})

// Clear all filters function
window.clearAllFilters = function() {
  document.getElementById("search-input").value = ""
  document.getElementById("category-filter").value = "all"
  document.getElementById("sort-filter").value = "featured"
  filterProducts()
}

// Add to cart function
window.addToCart = (productId) => {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]")
  const existingItem = cart.find((item) => item.productId === productId)

  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.push({ productId, quantity: 1 })
  }

  localStorage.setItem("cart", JSON.stringify(cart))
  alert("Product added to cart!")
  location.reload()
}

// Initialize
loadProducts()
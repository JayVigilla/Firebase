import { renderBreadcrumb } from "./components.js"
import { db, collection, addDoc } from "./firebase-config.js"

// Render breadcrumb
const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer) {
  breadcrumbContainer.innerHTML = renderBreadcrumb([
    { label: "Home", link: "index.html" },
    { label: "Contact", link: null },
  ])
}

// Handle contact form submission
const contactForm = document.getElementById("contact-form")
const successMessage = document.getElementById("success-message")
const errorMessage = document.getElementById("error-message")

contactForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const formData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    subject: document.getElementById("subject").value,
    message: document.getElementById("message").value,
    createdAt: new Date().toISOString(),
    status: "new",
  }

  try {
    await addDoc(collection(db, "feedback"), formData)

    successMessage.textContent = "Thank you! Your message has been sent successfully."
    successMessage.classList.add("active")
    errorMessage.classList.remove("active")

    contactForm.reset()

    setTimeout(() => {
      successMessage.classList.remove("active")
    }, 5000)
  } catch (error) {
    console.error("Error submitting feedback:", error)
    errorMessage.textContent = "Failed to send message. Please try again."
    errorMessage.classList.add("active")
    successMessage.classList.remove("active")
  }
})

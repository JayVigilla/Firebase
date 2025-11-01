import { renderBreadcrumb } from "./components.js"
import { resetPassword } from "./firebase-config.js"

// Render breadcrumb
const breadcrumbContainer = document.getElementById("breadcrumb-container")
if (breadcrumbContainer) {
  breadcrumbContainer.innerHTML = renderBreadcrumb([
    { label: "Home", link: "index.html" },
    { label: "Forgot Password", link: null },
  ])
}

// Handle forgot password form submission
const forgotPasswordForm = document.getElementById("forgot-password-form")
const errorMessage = document.getElementById("error-message")
const successMessage = document.getElementById("success-message")

forgotPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = document.getElementById("email").value.trim()

  // Hide previous messages
  errorMessage.classList.remove("active")
  successMessage.classList.remove("active")

  try {
    const result = await resetPassword(email)

    if (result.success) {
      successMessage.textContent = result.message
      successMessage.classList.add("active")
      forgotPasswordForm.reset()
    } else {
      throw new Error(result.message)
    }
  } catch (error) {
    console.error("Password reset error:", error)
    errorMessage.textContent = "Failed to send reset email. Please check your email address."
    errorMessage.classList.add("active")
  }
})

import { auth, signInWithEmailAndPassword, isAdmin } from "./firebase-config.js"

// Handle admin login form submission
const adminLoginForm = document.getElementById("admin-login-form")
const errorMessage = document.getElementById("error-message")

adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  // Clear previous errors
  if (errorMessage) {
    errorMessage.textContent = ""
    errorMessage.classList.remove("active")
  }

  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value

  // Verify admin credentials
  if (!isAdmin(email)) {
    if (errorMessage) {
      errorMessage.textContent = "Invalid admin credentials."
      errorMessage.classList.add("active")
    }
    return
  }

  try {
    await signInWithEmailAndPassword(auth, email, password)

    // Save admin session
    localStorage.setItem(
      "adminUser",
      JSON.stringify({
        email: email,
        role: "admin",
        loginTime: new Date().toISOString(),
      }),
    )

    // Redirect to admin dashboard
    window.location.href = "admin-dashboard.html"
  } catch (error) {
    console.error("Admin login error:", error)
    let message = "Login failed. Please check your credentials."

    if (error.code === "auth/user-not-found") {
      message = "Admin account not found. Please contact system administrator."
    } else if (error.code === "auth/wrong-password") {
      message = "Incorrect password."
    }

    if (errorMessage) {
      errorMessage.textContent = message
      errorMessage.classList.add("active")
    }
  }
})
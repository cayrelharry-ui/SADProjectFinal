/**
 * LogIn.js
 * Handles ONLY login page functionality
 * NO auth checks - auth-check.js handles that
 */

const auth = window.supabaseAuth || {};
const signIn = auth.signIn;
const signUp = auth.signUp;

document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ DOM Loaded - Starting login page script");
    setupLoginPage();
});

function setupLoginPage() {
    console.log("Setting up login page...");

    // --- 1. Get all elements ---
    const loginForm = document.getElementById('loginForm');
    const identifierInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const loginBtn = document.getElementById('loginBtn') || loginForm?.querySelector('button[type="submit"]');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');

    // Create Account Modal Elements
    const createAccountBtn = document.getElementById('createAccountBtn');
    const createAccountModal = document.getElementById('createAccountModal');
    const createAccountForm = document.getElementById('createAccountForm');
    const createBtnText = document.getElementById('createBtnText');
    const createBtnSpinner = document.getElementById('createBtnSpinner');

    // Guest button
    const guestBtn = document.querySelector('.btn-guest');

    // Check critical elements
    if (!loginForm || !identifierInput || !passwordInput) {
        console.error("❌ Critical elements missing!");
        showError("Some page elements failed to load. Please refresh.", true);
        return;
    }

    // --- 2. Initialize Bootstrap Modal ---
    let modalInstance = null;
    if (createAccountModal && typeof bootstrap !== 'undefined') {
        modalInstance = new bootstrap.Modal(createAccountModal);
        console.log("✅ Modal initialized");
    }

    // --- 3. SETUP PASSWORD TOGGLES ---
    setupPasswordToggles();

    function setupPasswordToggles() {
        console.log("🔐 Setting up password toggles...");

        function setupToggle(toggleId, inputId) {
            const toggle = document.getElementById(toggleId);
            const input = document.getElementById(inputId);

            if (!toggle || !input) {
                console.log(`⚠️ Toggle not found: ${toggleId} or ${inputId}`);
                return;
            }

            console.log(`✅ Setting up toggle: ${toggleId} for input: ${inputId}`);

            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const currentType = input.getAttribute('type');
                const newType = currentType === 'password' ? 'text' : 'password';

                // Toggle input type
                input.setAttribute('type', newType);

                // Toggle icon
                const icon = this.querySelector('i');
                if (icon) {
                    if (newType === 'text') {
                        icon.classList.remove('bi-eye');
                        icon.classList.add('bi-eye-slash');
                    } else {
                        icon.classList.remove('bi-eye-slash');
                        icon.classList.add('bi-eye');
                    }
                }

                input.focus();
            });
        }

        setupToggle('passwordToggle', 'password');
        setupToggle('newPasswordToggle', 'newPassword');
        setupToggle('confirmPasswordToggle', 'confirmPassword');
    }

    // --- 4. Login Form Submission ---
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log("📝 Login form submitted");

        const identifier = identifierInput.value.trim();
        const password = passwordInput.value;

        if (!identifier || !password) {
            showError('Please enter your email/username and password.');
            return;
        }

        setLoadingState(true);

        try {
            console.log("🔐 Attempting authentication...");

            const result = await signIn(identifier, password);

            if (result.error) {
                throw new Error(result.error.message || 'Invalid login credentials.');
            }

            const user = result.user;
            console.log('✅ Login successful:', user.email);

            // Check account status
            if (user.status && user.status.toLowerCase() !== 'active') {
                showError(`Your account is ${user.status}. Please wait for administrator approval.`);
                setLoadingState(false);
                return;
            }

            // Store user data
            storeUserSession(user, result.session);

            // Redirect based on role
            setTimeout(() => {
                redirectBasedOnRole(user.role);
            }, 500);

        } catch (err) {
            console.error('❌ Login error:', err);
            showError(err.message || 'An error occurred during login.');
            setLoadingState(false);
        }
    });

    // --- 5. Create Account Functionality ---
    if (createAccountBtn) {
        createAccountBtn.addEventListener('click', async function() {
            console.log("📝 Create account button clicked");

            const fullName = document.getElementById('fullName')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const username = document.getElementById('usernameField')?.value.trim() || email?.split('@')[0];
            const password = document.getElementById('newPassword')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;
            const role = document.getElementById('role')?.value || 'public';

            // Validation
            if (!fullName || !email || !password || !confirmPassword) {
                showModalError('Please fill in all required fields.');
                return;
            }

            if (password !== confirmPassword) {
                showModalError('Passwords do not match.');
                return;
            }

            if (password.length < 6) {
                showModalError('Password must be at least 6 characters long.');
                return;
            }

            if (!validateEmail(email)) {
                showModalError('Please enter a valid email address.');
                return;
            }

            setCreateAccountLoading(true);

            try {
                console.log("👤 Creating new account...");

                const result = await signUp(email, password, fullName, username, role);

                if (result.error) {
                    throw new Error(result.error.message);
                }

                // **SUCCESS MESSAGE - Not "approved" but "created"**
                showSuccessMessage('Account created. Please wait for admin approval.');

                if (modalInstance) modalInstance.hide();
                if (createAccountForm) createAccountForm.reset();
                clearModalErrors();

                // Optional: Pre-fill login form with the new email
                if (identifierInput && email) {
                    identifierInput.value = email;
                }

            } catch (err) {
                console.error('❌ Create account error:', err);
                showModalError(err.message || 'Error creating account. Please try again.');
            } finally {
                setCreateAccountLoading(false);
            }
        });
    }

    // --- 6. Guest Login ---
    if (guestBtn) {
        guestBtn.addEventListener('click', function() {
            console.log("👤 Guest button clicked");

            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="bi bi-arrow-right-circle"></i> Redirecting...';
            this.disabled = true;

            // Create guest user object
            const guestUser = {
                user_id: 0,
                email: 'guest@example.com',
                full_name: 'Guest User',
                username: 'guest',
                role: 'guest',
                status: 'active'
            };

            storeUserSession(guestUser, {
                access_token: 'guest_token',
                expires_at: Date.now() + (2 * 60 * 60 * 1000)
            });

            localStorage.setItem('isGuest', 'true');

            // Redirect to home page
            setTimeout(() => {
                window.location.href = '../Home.html';
            }, 500);

            setTimeout(() => {
                this.innerHTML = originalHTML;
                this.disabled = false;
            }, 3000);
        });
    }

    // --- 7. Helper Functions ---

    function setLoadingState(isLoading) {
        if (loginBtn) loginBtn.disabled = isLoading;
        if (btnText && btnSpinner) {
            btnText.textContent = isLoading ? 'Signing In...' : 'Sign In';
            btnSpinner.classList.toggle('d-none', !isLoading);
        }
    }

    function setCreateAccountLoading(isLoading) {
        if (createAccountBtn) createAccountBtn.disabled = isLoading;
        if (createBtnText && createBtnSpinner) {
            createBtnText.textContent = isLoading ? 'Creating...' : 'Create Account';
            createBtnSpinner.classList.toggle('d-none', !isLoading);
        }
    }

    function storeUserSession(user, session) {
        // Store user data
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userRole', user.role || 'public');
        localStorage.setItem('userName', user.full_name || 'User');
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userId', user.user_id);
        localStorage.setItem('username', user.username);

        // Store session data
        if (session) {
            localStorage.setItem('sessionToken', session.access_token);
            localStorage.setItem('sessionExpiry', session.expires_at || Date.now() + (24 * 60 * 60 * 1000));
        }

        localStorage.setItem('lastLogin', new Date().toISOString());
        console.log("💾 Session stored for:", user.email);
    }

    function redirectBasedOnRole(role) {
        const roleLower = (role || 'public').toLowerCase();
        const pageMap = {
            'admin': '../HTML/Admin_Panel.html',
            'partner': '../HTML/Partner_Panel.html',
            'faculty': '../Faculty/Faculty.html',
            'coordinator': '../HTML/Partner_Panel.html',
            'public': '../HTML/Public_Dashboard.html',
            'guest': '../index.html'
        };

        const redirectUrl = pageMap[roleLower] || '../index.html';
        console.log(`🔄 Redirecting to: ${redirectUrl}`);
        window.location.href = redirectUrl;
    }

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showError(message, isAlert = false) {
    if (isAlert) {
        alert(message);
        return;
    }

    if (errorAlert && errorMessage) {
        errorMessage.textContent = message; // Just shows the message without "Error:"
        errorAlert.classList.remove('d-none');
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 5000);
    }
}
    function showSuccessMessage(message) {
    if (errorAlert && errorMessage) {
        // Use the error alert element but style it as success
        errorMessage.textContent = message; // Just shows the message without "Error:"
        errorAlert.classList.remove('d-none', 'alert-danger');
        errorAlert.classList.add('alert-success');

        // Change icon if present
        const icon = errorAlert.querySelector('.bi');
        if (icon) {
            icon.classList.remove('bi-exclamation-triangle');
            icon.classList.add('bi-check-circle');
        }

        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
            errorAlert.classList.add('d-none');
            // Reset styling
            errorAlert.classList.remove('alert-success');
            errorAlert.classList.add('alert-danger');
            if (icon) {
                icon.classList.remove('bi-check-circle');
                icon.classList.add('bi-exclamation-triangle');
            }
        }, 5000);
    }
}

    function showModalError(message) {
        const modalBody = document.querySelector('.modal-body');
        if (!modalBody) return;

        const existingAlert = document.querySelector('.modal .alert-danger');
        if (existingAlert) existingAlert.remove();

        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alert.innerHTML = `
            <strong>Error:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        modalBody.appendChild(alert);
        alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function clearModalErrors() {
        const modalAlerts = document.querySelectorAll('.modal .alert');
        modalAlerts.forEach(alert => alert.remove());
    }

    if (identifierInput) {
        identifierInput.addEventListener('input', () => {
            if (errorAlert) errorAlert.classList.add('d-none');
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            if (errorAlert) errorAlert.classList.add('d-none');
        });
    }

    setTimeout(() => {
        if (identifierInput) identifierInput.focus();
    }, 100);

    console.log("✅ Login page setup complete");
}
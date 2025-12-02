document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ DOM Loaded - Starting login script");
    
    // Get all elements
    const loginForm = document.getElementById('loginForm');
    const createAccountForm = document.getElementById('createAccountForm');
    const createAccountBtn = document.getElementById('createAccountBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const createBtnText = document.getElementById('createBtnText');
    const createBtnSpinner = document.getElementById('createBtnSpinner');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const successAlert = document.getElementById('successAlert');
    const successMessage = document.getElementById('successMessage');
    
    // Debug log
    console.log("Elements found:", {
        loginForm: !!loginForm,
        usernameInput: !!usernameInput,
        passwordInput: !!passwordInput,
        passwordToggle: !!passwordToggle,
        errorAlert: !!errorAlert
    });
    
    // Check critical elements
    if (!loginForm || !usernameInput || !passwordInput || !passwordToggle) {
        console.error("❌ Critical elements missing!");
        alert("Some page elements failed to load. Please refresh.");
        return;
    }
    
    // Initialize modal
    let createAccountModal = null;
    const modalElement = document.getElementById('createAccountModal');
    if (modalElement && bootstrap) {
        createAccountModal = new bootstrap.Modal(modalElement);
        console.log("✅ Modal initialized");
    }
    
    // 1. Password toggle functionality for login form
    passwordToggle.addEventListener('click', function() {
        console.log("Password toggle clicked");
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = this.querySelector('i');
        if (type === 'password') {
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        } else {
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        }
    });
    
    // 2. Password toggle for create account form
    setupPasswordToggle('newPasswordToggle', 'newPassword');
    setupPasswordToggle('confirmPasswordToggle', 'confirmPassword');
    
    function setupPasswordToggle(toggleId, inputId) {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(inputId);
        
        if (toggle && input) {
            toggle.addEventListener('click', function() {
                console.log(`${toggleId} clicked`);
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                const icon = this.querySelector('i');
                if (type === 'password') {
                    icon.classList.remove('bi-eye-slash');
                    icon.classList.add('bi-eye');
                } else {
                    icon.classList.remove('bi-eye');
                    icon.classList.add('bi-eye-slash');
                }
            });
        }
    }
    
    // 3. Login Form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log("Login form submitted");
        
        btnText.textContent = 'Signing In...';
        btnSpinner.classList.remove('d-none');
        errorAlert.classList.add('d-none');
        if (successAlert) successAlert.classList.add('d-none');
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        console.log("Login attempt:", { username, password: password ? "***" : "empty" });
        
        if (!username || !password) {
            showError('Please enter both username/email and password.');
            resetButtonState();
            return;
        }
        
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        // TEST FIRST: Check if PHP file is accessible
        console.log("Attempting to fetch PHP file...");
        
        fetch('PHP/LogIn.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            credentials: 'same-origin' // Important for sessions
        })
        .then(response => {
            console.log('Response status:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text().then(text => {
                console.log('Raw response:', text);
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('JSON parse error:', e);
                    throw new Error('Invalid JSON response: ' + text.substring(0, 100));
                }
            });
        })
        .then(data => {
            console.log('Login response:', data);
            
            if (data.status === 'success') {
                showSuccess(data.message);
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('userName', username);

                setTimeout(() => {
                    const role = data.role.toLowerCase();
                    const pages = {
                        'admin': 'Admin_Panel.html',
                        'faculty': 'Faculty_Dashboard.html', 
                        'coordinator': 'Coordinator_Dashboard.html',
                        'public': 'Public_Dashboard.html'
                    };
                    
                    // Fallback to index.html if page doesn't exist
                    window.location.href = pages[role] || 'index.html';
                }, 1500);
            } else {
                showError(data.message || 'Login failed.');
                resetButtonState();
            }
        })
        .catch(err => {
            console.error('Login fetch error:', err);
            showError('Connection error: ' + err.message + '. Check PHP file path.');
            resetButtonState();
        });
    });
    
    // 4. Create Account functionality
    if (createAccountBtn) {
        createAccountBtn.addEventListener('click', function() {
            console.log("Create account button clicked");
            
            const fullName = document.getElementById('fullName')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const password = document.getElementById('newPassword')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;
            const role = document.getElementById('role')?.value;
            
            console.log("Form data:", { fullName, email, role, password: password ? "***" : "empty" });
            
            // Validation
            if (!fullName || !email || !password || !confirmPassword || !role) {
                showModalError('Please fill in all fields.');
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
            
            // Show loading state
            createBtnText.textContent = 'Creating...';
            createBtnSpinner.classList.remove('d-none');
            createAccountBtn.disabled = true;
            
            const formData = new URLSearchParams();
            formData.append('fullName', fullName);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('role', role);
            
            console.log("Attempting to create account...");
            
            fetch('PHP/CreateAccount.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
                credentials: 'same-origin'
            })
            .then(response => {
                console.log('Create account response status:', response.status);
                return response.text().then(text => {
                    console.log('Raw response:', text);
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        console.error('JSON parse error:', e);
                        return { status: 'error', message: 'Invalid server response' };
                    }
                });
            })
            .then(data => {
                if (data.status === 'success') {
                    showSuccess('Account created successfully! Please wait for administrator approval.');
                    if (createAccountModal) {
                        createAccountModal.hide();
                    }
                    if (createAccountForm) {
                        createAccountForm.reset();
                    }
                    clearModalErrors();
                } else {
                    showModalError('Error: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(err => {
                console.error('Create account error:', err);
                showModalError('Error creating account: ' + err.message);
            })
            .finally(() => {
                createBtnText.textContent = 'Create Account';
                createBtnSpinner.classList.add('d-none');
                createAccountBtn.disabled = false;
            });
        });
    }
    
   // Guest button functionality - CORRECT PATH
const guestBtn = document.querySelector('.btn-guest');
if (guestBtn) {
    guestBtn.addEventListener('click', function() {
        console.log("Guest button clicked - redirecting to Home.html");
        
        // Show loading state
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="bi bi-arrow-right-circle"></i> Redirecting...';
        this.disabled = true;
        
        // Store guest session info
        localStorage.setItem('userRole', 'guest');
        localStorage.setItem('isGuest', 'true');
        localStorage.setItem('userName', 'Guest User');
        localStorage.setItem('lastLogin', new Date().toISOString());
        
        // REDIRECT TO HOME.HTML IN ROOT FOLDER
        // Since Login.html is in HTML/ folder, we need ../ to go up one level
        window.location.href = "../Home.html";
    });
}
    
    // Helper functions
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function showModalError(message) {
        const modalBody = document.querySelector('.modal-body');
        if (!modalBody) return;
        
        const existingAlert = document.querySelector('.modal .alert-danger');
        if (existingAlert) {
            existingAlert.remove();
        }
        
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
    
    function showError(message) {
        if (!errorAlert || !errorMessage) return;
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 5000);
    }
    
    function showSuccess(message) {
        if (!successAlert || !successMessage) return;
        successMessage.textContent = message;
        successAlert.classList.remove('d-none');
        successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            successAlert.classList.add('d-none');
        }, 3000);
    }
    
    function resetButtonState() {
        if (!btnText || !btnSpinner) return;
        btnText.textContent = 'Sign In';
        btnSpinner.classList.add('d-none');
    }
    
    // Clear alerts on input
    usernameInput.addEventListener('input', () => {
        if (errorAlert) errorAlert.classList.add('d-none');
        if (successAlert) successAlert.classList.add('d-none');
    });
    
    passwordInput.addEventListener('input', () => {
        if (errorAlert) errorAlert.classList.add('d-none');
        if (successAlert) successAlert.classList.add('d-none');
    });
    
    console.log("✅ Login script initialization complete");
});
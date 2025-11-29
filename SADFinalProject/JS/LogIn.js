document.addEventListener('DOMContentLoaded', function() {
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
    const credentialItems = document.querySelectorAll('.credential-item');
    const createAccountModal = new bootstrap.Modal(document.getElementById('createAccountModal'));

    // Password toggle functionality for login form
    passwordToggle.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
    });

    // Password toggle for create account form
    const newPasswordToggle = document.getElementById('newPasswordToggle');
    const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
    
    if (newPasswordToggle) {
        newPasswordToggle.addEventListener('click', function() {
            const newPasswordInput = document.getElementById('newPassword');
            const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            newPasswordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
        });
    }

    if (confirmPasswordToggle) {
        confirmPasswordToggle.addEventListener('click', function() {
            const confirmPasswordInput = document.getElementById('confirmPassword');
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
        });
    }

    // Fill credentials when clicking demo items
    credentialItems.forEach(item => {
        item.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            usernameInput.value = username;
            passwordInput.value = 'password123';

            credentialItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Login Form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        btnText.textContent = 'Signing In...';
        btnSpinner.classList.remove('d-none');
        errorAlert.classList.add('d-none');
        if (successAlert) successAlert.classList.add('d-none');

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showError('Please enter both username/email and password.');
            resetButtonState();
            return;
        }

        console.log('Attempting login for:', username);

        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        fetch('../PHP/LogIn.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json();
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
                    
                    window.location.href = pages[role] || 'Admin_Panel.html';
                }, 1500);
            } else {
                showError(data.message);
                resetButtonState();
            }
        })
        .catch(err => {
            console.error('Login error:', err);
            showError('Connection error. Please try again.');
            resetButtonState();
        });
    });

    // Create Account functionality
    if (createAccountBtn) {
        createAccountBtn.addEventListener('click', function() {
            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const role = document.getElementById('role').value;

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

            fetch('../PHP/CreateAccount.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Show success message in main form
                    showSuccess('Account created successfully! Please wait for administrator approval.');
                    createAccountModal.hide();
                    createAccountForm.reset();
                    clearModalErrors();
                } else {
                    showModalError('Error: ' + data.message);
                }
            })
            .catch(err => {
                console.error('Create account error:', err);
                showModalError('Error creating account. Please try again.');
            })
            .finally(() => {
                createBtnText.textContent = 'Create Account';
                createBtnSpinner.classList.add('d-none');
                createAccountBtn.disabled = false;
            });
        });
    }

    // Clear modal when hidden
    if (createAccountModal) {
        createAccountModal._element.addEventListener('hidden.bs.modal', function() {
            createAccountForm.reset();
            clearModalErrors();
        });
    }

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showModalError(message) {
        // Remove any existing modal alerts
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
        
        const modalBody = document.querySelector('.modal-body');
        modalBody.appendChild(alert);
        
        // Scroll to alert
        alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function clearModalErrors() {
        const modalAlerts = document.querySelectorAll('.modal .alert');
        modalAlerts.forEach(alert => alert.remove());
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 5000);
    }

    function showSuccess(message) {
        if (successAlert && successMessage) {
            successMessage.textContent = message;
            successAlert.classList.remove('d-none');
            successAlert.scrollIntoView({ behavior: 'smooth', block: 'center'} );
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                successAlert.classList.add('d-none');
            }, 3000);
        }
    }

    function resetButtonState() {
        btnText.textContent = 'Sign In';
        btnSpinner.classList.add('d-none');
    }

    // Clear alerts on input
    usernameInput.addEventListener('input', () => {
        errorAlert.classList.add('d-none');
        if (successAlert) successAlert.classList.add('d-none');
    });
    
    passwordInput.addEventListener('input', () => {
        errorAlert.classList.add('d-none');
        if (successAlert) successAlert.classList.add('d-none');
    });

    // Real-time password validation for create account form
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (newPasswordInput && confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            const password = newPasswordInput.value;
            const confirmPassword = this.value;
            
            if (confirmPassword && password !== confirmPassword) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            } else if (confirmPassword) {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            } else {
                this.classList.remove('is-valid', 'is-invalid');
            }
        });

        newPasswordInput.addEventListener('input', function() {
            const password = this.value;
            const confirmPassword = confirmPasswordInput.value;
            
            if (password.length < 6 && password.length > 0) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            } else if (password.length >= 6) {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
                
                // Update confirm password validation
                if (confirmPassword) {
                    if (password === confirmPassword) {
                        confirmPasswordInput.classList.add('is-valid');
                        confirmPasswordInput.classList.remove('is-invalid');
                    } else {
                        confirmPasswordInput.classList.add('is-invalid');
                        confirmPasswordInput.classList.remove('is-valid');
                    }
                }
            } else {
                this.classList.remove('is-valid', 'is-invalid');
                confirmPasswordInput.classList.remove('is-valid', 'is-invalid');
            }
        });
    }

    // Email validation for create account form
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            const email = this.value;
            
            if (email && !validateEmail(email)) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            } else if (email) {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            } else {
                this.classList.remove('is-valid', 'is-invalid');
            }
        });
    }
});
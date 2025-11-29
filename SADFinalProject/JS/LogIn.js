document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const credentialItems = document.querySelectorAll('.credential-item');
    
    // Password toggle functionality
    passwordToggle.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
    });
    
    // Fill credentials when clicking demo items
    credentialItems.forEach(item => {
        item.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            usernameInput.value = username;
            passwordInput.value = 'password123';
            
            // Highlight the selected credential
            credentialItems.forEach(i => i.style.backgroundColor = '');
            this.style.backgroundColor = '#e9ecef';
        });
    });
    
    // Form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Show loading state
        btnText.textContent = 'Signing In...';
        btnSpinner.classList.remove('d-none');
        errorAlert.classList.add('d-none');
        
        // Get form values
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // Validate inputs
        if (!username || !password) {
            showError('Please enter both username and password.');
            resetButtonState();
            return;
        }
        
        // Simulate API call delay
        setTimeout(() => {
            // Validate credentials
            const validCredentials = {
                'admin': 'password123',
                'faculty': 'password123',
                'coordinator': 'password123',
                'public': 'password123'
            };
            
            if (validCredentials[username] && validCredentials[username] === password) {
                // Successful login
                localStorage.setItem('userRole', username);
                localStorage.setItem('rememberMe', rememberMe);
                
                // Show success message
                showSuccess('Login successful! Redirecting...');
                
                // Redirect to admin panel after a short delay
                setTimeout(() => {
                    window.location.href = 'Admin_Panel.html';
                }, 1000);
            } else {
                // Failed login
                showError('Invalid username or password. Please try again.');
                resetButtonState();
            }
        }, 1500);
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 5000);
    }
    
    function showSuccess(message) {
        // Create success alert if it doesn't exist
        let successAlert = document.getElementById('successAlert');
        if (!successAlert) {
            successAlert = document.createElement('div');
            successAlert.id = 'successAlert';
            successAlert.className = 'alert alert-success mt-3';
            successAlert.innerHTML = `<strong>Success:</strong> <span id="successMessage">${message}</span>`;
            loginForm.parentNode.insertBefore(successAlert, errorAlert);
        } else {
            document.getElementById('successMessage').textContent = message;
            successAlert.classList.remove('d-none');
        }
    }
    
    function resetButtonState() {
        btnText.textContent = 'Sign In';
        btnSpinner.classList.add('d-none');
    }
    
    // Check if remember me was enabled
    if (localStorage.getItem('rememberMe') === 'true') {
        document.getElementById('rememberMe').checked = true;
        
        // In a real app, you might pre-fill the username here
        // from secure storage
    }
    
    // Add input event listeners to clear error when user starts typing
    usernameInput.addEventListener('input', function() {
        errorAlert.classList.add('d-none');
    });
    
    passwordInput.addEventListener('input', function() {
        errorAlert.classList.add('d-none');
    });
});
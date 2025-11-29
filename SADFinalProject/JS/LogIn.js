document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const successAlert = document.getElementById('successAlert');
    const successMessage = document.getElementById('successMessage');
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

            credentialItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        btnText.textContent = 'Signing In...';
        btnSpinner.classList.remove('d-none');
        errorAlert.classList.add('d-none');
        if (successAlert) successAlert.classList.add('d-none');

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            showError('Please enter both username/email and password.');
            resetButtonState();
            return;
        }

        console.log('Attempting login for:', username);

        // Method 1: Try URLSearchParams first (more reliable for form data)
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
                localStorage.setItem('userRole', data.role || username);
                localStorage.setItem('userName', username);

                setTimeout(() => {
                    // Use relative paths from current location
                    if (data.role) {
                        switch(data.role.toLowerCase()) {
                            case 'admin':
                                window.location.href = 'Admin_Panel.html';
                                break;
                            case 'faculty':
                                window.location.href = 'Faculty_Dashboard.html';
                                break;
                            case 'coordinator':
                                window.location.href = 'Coordinator_Dashboard.html';
                                break;
                            case 'public':
                                window.location.href = 'Public_Dashboard.html';
                                break;
                            default:
                                window.location.href = 'Admin_Panel.html';
                        }
                    } else {
                        window.location.href = 'Admin_Panel.html';
                    }
                }, 1000);
            } else {
                showError(data.message || 'Login failed. Please try again.');
                resetButtonState();
            }
        })
        .catch(err => {
            console.error('Login error:', err);
            showError('Server error: ' + err.message);
            resetButtonState();
        });
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 5000);
    }

    function showSuccess(message) {
        if (successAlert && successMessage) {
            successMessage.textContent = message;
            successAlert.classList.remove('d-none');
            successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
});
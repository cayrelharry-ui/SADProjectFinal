document.addEventListener('DOMContentLoaded', () => {
    // Set current year
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // Set default date to today
    const letterDate = document.getElementById('letterDate');
    if (letterDate) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        letterDate.value = `${year}-${month}-${day}`;
    }

    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIconOpen = document.getElementById('menu-icon-open');
    const menuIconClose = document.getElementById('menu-icon-close');
    const mobileDropdownButtons = document.querySelectorAll('.mobile-menu-item');

    // 1. Mobile Menu Toggle Logic
    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        menuIconOpen.classList.toggle('hidden');
        menuIconClose.classList.toggle('hidden');
    });

    // 2. Mobile Dropdown Toggle Logic
    mobileDropdownButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const targetDropdown = document.getElementById(targetId);
            const svgIcon = button.querySelector('svg');

            if (targetDropdown.classList.contains('hidden')) {
                // Close all other dropdowns
                document.querySelectorAll('.mobile-dropdown-content').forEach(dd => dd.classList.add('hidden'));
                document.querySelectorAll('.mobile-menu-item svg').forEach(svg => svg.classList.remove('rotate-180'));

                // Open the clicked one
                targetDropdown.classList.remove('hidden');
                svgIcon.classList.add('rotate-180');
            } else {
                // Close the clicked one
                targetDropdown.classList.add('hidden');
                svgIcon.classList.remove('rotate-180');
            }
        });
    });

    // 3. Desktop Dropdown Logic (for touch/click fallbacks on group-based hover)
    const desktopDropdowns = document.querySelectorAll('#desktop-menu > li');

    desktopDropdowns.forEach(li => {
        li.addEventListener('click', (event) => {
            if (window.innerWidth < 1024 || 'ontouchstart' in window) {
                event.stopPropagation();

                const dropdownContent = li.querySelector('.dropdown-content');

                if (dropdownContent.classList.contains('opacity-0')) {
                    desktopDropdowns.forEach(otherLi => {
                        if (otherLi !== li) {
                            otherLi.querySelector('.dropdown-content').classList.add('opacity-0', 'invisible');
                        }
                    });
                    dropdownContent.classList.remove('opacity-0', 'invisible');
                } else {
                    dropdownContent.classList.add('opacity-0', 'invisible');
                }
            }
        });
    });

    // Close desktop dropdowns when clicking outside
    document.addEventListener('click', (event) => {
        if (window.innerWidth >= 1024 && 'ontouchstart' in window) {
            desktopDropdowns.forEach(li => {
                if (!li.contains(event.target)) {
                    li.querySelector('.dropdown-content').classList.add('opacity-0', 'invisible');
                }
            });
        }
    });

    // File upload handler
    window.handleFileSelect = function(event) {
        const files = event.target.files;
        const fileList = document.getElementById('fileList');
        const fileItems = document.getElementById('fileItems');

        if (files.length > 0) {
            fileList.classList.remove('hidden');
            fileItems.innerHTML = '';

            Array.from(files).forEach((file, index) => {
                // Check file size (10MB limit)
                const maxSize = 10 * 1024 * 1024; // 10MB in bytes
                if (file.size > maxSize) {
                    alert(`File "${file.name}" exceeds the 10MB size limit and will not be uploaded.`);
                    return;
                }

                const fileItem = document.createElement('div');
                fileItem.className = 'flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg';
                fileItem.innerHTML = `
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        <svg class="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate">${file.name}</p>
                            <p class="text-xs text-gray-500">${formatFileSize(file.size)}</p>
                        </div>
                    </div>
                    <button type="button" onclick="removeFile(${index})" class="ml-3 text-red-600 hover:text-red-800 flex-shrink-0">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                `;
                fileItem.dataset.index = index;
                fileItems.appendChild(fileItem);
            });
        } else {
            fileList.classList.add('hidden');
        }
    };

    // Remove file function
    window.removeFile = function(index) {
        const fileInput = document.getElementById('fileUpload');
        const dt = new DataTransfer();
        const files = Array.from(fileInput.files);

        files.forEach((file, i) => {
            if (i !== index) {
                dt.items.add(file);
            }
        });

        fileInput.files = dt.files;

        // Trigger the file select handler to update the display
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
    };

    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Form submission handler
    const partnerForm = document.getElementById('partnerForm');
    if (partnerForm) {
        partnerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate file sizes before submission
            const fileInput = document.getElementById('fileUpload');
            const files = fileInput.files;
            const maxSize = 10 * 1024 * 1024; // 10MB

            for (let i = 0; i < files.length; i++) {
                if (files[i].size > maxSize) {
                    alert(`File "${files[i].name}" exceeds the 10MB size limit. Please remove it before submitting.`);
                    return;
                }
            }

            // Disable submit button to prevent double submission
            const submitButton = document.getElementById('submitButton');
            const submitButtonText = document.getElementById('submitButtonText');
            const submitButtonLoader = document.getElementById('submitButtonLoader');

            submitButton.disabled = true;
            submitButtonText.classList.add('hidden');
            submitButtonLoader.classList.remove('hidden');

            try {
                // Create FormData object from form (automatically includes all fields and files)
                const formData = new FormData(partnerForm);

                // Send form data to server
                const response = await fetch('../PHP/SubmitPartnershipRequest.php', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.status === 'success') {
                    // Show success message
                    let message = result.message;
                    if (result.uploaded_files && result.uploaded_files.length > 0) {
                        message += '\n\nUploaded files:\n' + result.uploaded_files.join('\n');
                    }
                    if (result.failed_files && result.failed_files.length > 0) {
                        message += '\n\nFailed files:\n' + result.failed_files.join('\n');
                    }

                    alert(message + '\n\nOur team will contact you within 5-7 business days.');

                    // Reset form
                    partnerForm.reset();
                    document.getElementById('fileList').classList.add('hidden');
                    document.getElementById('fileItems').innerHTML = '';

                    // Reset date to today
                    if (letterDate) {
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = String(today.getMonth() + 1).padStart(2, '0');
                        const day = String(today.getDate()).padStart(2, '0');
                        letterDate.value = `${year}-${month}-${day}`;
                    }
                } else {
                    // Show error message
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('An error occurred while submitting your request. Please try again later.');
            } finally {
                // Re-enable submit button
                submitButton.disabled = false;
                submitButtonText.classList.remove('hidden');
                submitButtonLoader.classList.add('hidden');
            }
        });
    }
});

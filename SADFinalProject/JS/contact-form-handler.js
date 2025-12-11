// JS/contact-form-handler.js - FIXED VERSION
import { supabase } from './db_connection.js';

class ContactFormHandler {
    constructor() {
        this.form = document.querySelector('form[action="#"]');
        if (this.form) {
            console.log('📝 Contact form handler initialized');
            this.initializeForm();
        }
    }
    
    initializeForm() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });
    }
    
    async handleSubmit() {
        const name = document.getElementById('name');
        const email = document.getElementById('email');
        const subject = document.getElementById('subject');
        const message = document.getElementById('message');
        const submitBtn = this.form.querySelector('button[type="submit"]');
        
        // Validate inputs
        if (!this.validateInputs(name, email, subject, message)) {
            return;
        }
        
        // Disable submit button
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `
            <svg class="w-5 h-5 mr-2 animate-spin inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Sending...
        `;
        submitBtn.disabled = true;
        
        try {
            console.log('📤 Submitting inquiry to database...');
            
            // Save to Supabase database - FIXED SYNTAX
            const { data, error } = await supabase
                .from('inquiries')
                .insert({
                    name: name.value.trim(),
                    email: email.value.trim(),
                    subject: subject.value,
                    message: message.value.trim(),
                    status: 'pending'
                });
            
            if (error) {
                console.error('Database error details:', error);
                throw new Error(`Failed to save inquiry: ${error.message}`);
            }
            
            console.log('✅ Inquiry saved successfully:', data);
            
            // Show success message
            this.showMessage('✅ Inquiry submitted successfully! We\'ll get back to you soon.', 'success');
            
            // Reset form
            this.form.reset();
            
            // Optional: Log to console for testing
            console.log('Form data submitted:', {
                name: name.value,
                email: email.value,
                subject: subject.value,
                message: message.value
            });
            
        } catch (error) {
            console.error('❌ Error submitting inquiry:', error);
            this.showMessage(`❌ Error: ${error.message}`, 'error');
        } finally {
            // Re-enable button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    validateInputs(name, email, subject, message) {
        // Reset error styles
        [name, email, subject, message].forEach(input => {
            input.classList.remove('border-red-500', 'bg-red-50');
            const errorMsg = input.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('error-message')) {
                errorMsg.remove();
            }
        });
        
        let isValid = true;
        const errors = [];
        
        // Name validation
        if (!name.value.trim()) {
            name.classList.add('border-red-500', 'bg-red-50');
            errors.push('Please enter your name');
            isValid = false;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.value.trim() || !emailRegex.test(email.value)) {
            email.classList.add('border-red-500', 'bg-red-50');
            errors.push('Please enter a valid email address');
            isValid = false;
        }
        
        // Message validation
        if (!message.value.trim() || message.value.trim().length < 10) {
            message.classList.add('border-red-500', 'bg-red-50');
            errors.push('Message must be at least 10 characters');
            isValid = false;
        }
        
        // Show all errors
        if (!isValid) {
            this.showMessage(errors.join('. '), 'error');
        }
        
        return isValid;
    }
    
    showMessage(text, type = 'info') {
        // Remove existing message
        const existing = document.getElementById('form-message');
        if (existing) existing.remove();
        
        // Create message
        const message = document.createElement('div');
        message.id = 'form-message';
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        message.className = `fixed top-24 left-1/2 transform -translate-x-1/2 z-[1001] ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in`;
        
        message.innerHTML = `
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${type === 'success' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' : ''}
                ${type === 'error' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' : ''}
                ${type === 'info' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' : ''}
            </svg>
            <span class="font-medium">${text}</span>
            <button onclick="this.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        
        document.body.appendChild(message);
        
        // Auto remove after 5 seconds (except errors)
        if (type !== 'error') {
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 5000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing contact form handler...');
    window.contactForm = new ContactFormHandler();
});

export default ContactFormHandler;
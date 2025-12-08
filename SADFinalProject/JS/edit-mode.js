// edit-mode.js - Complete edit mode with database persistence
import { supabase } from './db_connection.js';

class EditModeManager {
    constructor() {
        this.isEditMode = false;
        this.editableElements = [];
        this.editableImages = [];
        this.editButton = null;
        this.controls = null;
        this.currentUserId = null;
        this.isAdminUser = false;
        
        this.init();
    }
    
    async init() {
        console.log("Initializing edit mode...");
        
        // Check if user is admin
        await this.checkAdminStatus();
        
        if (!this.isAdminUser) {
            console.log("User is not admin, edit mode disabled");
            return;
        }
        
        console.log("Admin detected, setting up edit mode");
        this.createEditButton();
        this.setupEventListeners();
        
        // Add admin styles
        this.addAdminStyles();
    }
    
    async checkAdminStatus() {
    try {
        // Method 1: Check window functions
        if (window.isUserAdmin && typeof window.isUserAdmin === 'function') {
            this.isAdminUser = window.isUserAdmin();
            console.log("Admin check via window.isUserAdmin:", this.isAdminUser);
        }
        
        // Method 2: Check user profile
        if (!this.isAdminUser && window.getCurrentUser && typeof window.getCurrentUser === 'function') {
            const user = window.getCurrentUser();
            this.isAdminUser = user && (user.role === 'admin' || user.role === 'faculty');
            console.log("Admin/faculty check via getCurrentUser:", this.isAdminUser, "Role:", user?.role);
        }
        
        // Method 3: Check localStorage as fallback
        if (!this.isAdminUser) {
            const userRole = localStorage.getItem('userRole') || 'guest';
            this.isAdminUser = userRole === 'admin' || userRole === 'faculty';
            console.log("Admin/faculty check via localStorage:", this.isAdminUser);
        }
        
        // Get current user ID for database operations
        await this.getCurrentUserId();
        
    } catch (error) {
        console.log("Error checking admin status:", error);
        this.isAdminUser = false;
    }
}
    
    async getCurrentUserId() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                this.currentUserId = user.id;
                console.log("Current user ID:", this.currentUserId);
            }
        } catch (error) {
            console.log("Error getting user ID:", error);
        }
    }
    
    addAdminStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Edit mode styles */
            .edit-mode-active .editable-element {
                outline: 2px dashed #6366f1 !important;
                outline-offset: 4px !important;
                border-radius: 4px !important;
                padding: 4px !important;
                min-height: 1em !important;
                transition: all 0.2s ease !important;
                background: rgba(99, 102, 241, 0.05) !important;
            }
            
            .edit-mode-active .editable-element:focus {
                outline: 2px solid #6366f1 !important;
                background: rgba(99, 102, 241, 0.1) !important;
            }
            
            .edit-mode-active .editable-image {
                position: relative !important;
                cursor: pointer !important;
            }
            
            .edit-mode-active .editable-image:hover::before {
                content: '' !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(90, 44, 157, 0.3) !important;
                border: 2px dashed #5A2C9D !important;
                border-radius: 8px !important;
                z-index: 10 !important;
            }
            
            .edit-mode-active .editable-image:hover::after {
                content: '📷 Click to edit' !important;
                position: absolute !important;
                top: 10px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                background: rgba(90, 44, 157, 0.9) !important;
                color: white !important;
                padding: 4px 12px !important;
                border-radius: 20px !important;
                font-size: 12px !important;
                font-weight: bold !important;
                z-index: 11 !important;
                white-space: nowrap !important;
            }
            
            #edit-mode-toggle {
                box-shadow: 0 4px 12px rgba(90, 44, 157, 0.3) !important;
                transition: all 0.3s ease !important;
            }
            
            #edit-mode-toggle:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 6px 16px rgba(90, 44, 157, 0.4) !important;
            }
            
            /* Modal animations */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .image-edit-dialog {
                animation: fadeIn 0.2s ease !important;
            }
            
            .image-edit-dialog > div {
                animation: slideIn 0.3s ease !important;
            }
            
            /* Success message */
            #edit-message {
                animation: slideIn 0.3s ease !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    createEditButton() {
        // Remove existing button if any
        const existingBtn = document.getElementById('edit-mode-toggle');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        this.editButton = document.createElement('button');
        this.editButton.id = 'edit-mode-toggle';
        this.editButton.className = 'fixed bottom-6 right-6 z-50 bg-[#5A2C9D] text-white px-4 py-3 rounded-full shadow-lg hover:bg-[#4a2482] transition duration-300 flex items-center space-x-2 animate-pulse';
        this.editButton.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            <span>Edit Mode</span>
        `;
        this.editButton.title = "Click to edit page content and images (Ctrl+E)";
        
        document.body.appendChild(this.editButton);
    }
    
    setupEventListeners() {
        if (this.editButton) {
            this.editButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleEditMode();
            });
        }
        
        // Keyboard shortcut: Ctrl+E to toggle edit mode
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'e' && this.isAdminUser) {
                e.preventDefault();
                this.toggleEditMode();
            }
        });
    }
    
    toggleEditMode() {
        if (this.isEditMode) {
            this.disableEditMode();
        } else {
            this.enableEditMode();
        }
    }
    
   enableEditMode() {
    console.log("Enabling edit mode");
    this.isEditMode = true;
    
    // Update button
    if (this.editButton) {
        this.editButton.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            <span>Editing Mode ON</span>
        `;
        this.editButton.className = 'fixed bottom-6 right-6 z-50 bg-red-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-red-600 transition duration-300 flex items-center space-x-2';
    }
    
    // Make content editable
    this.makeContentEditable();
    
    // Make images editable
    this.makeImagesEditable();
    
    // Make calendar editable
    this.makeCalendarEditable();
    
    // Show edit controls
    this.showControls();
    
    // Add edit mode class to body
    document.body.classList.add('edit-mode-active');
    
    this.showMessage('Edit mode enabled. Click any text, image, or calendar event to edit.', 'info');
}
    
    disableEditMode() {
        console.log("Disabling edit mode");
        
        // Update button
        if (this.editButton) {
            this.editButton.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                <span>Edit Mode</span>
            `;
            this.editButton.className = 'fixed bottom-6 right-6 z-50 bg-[#5A2C9D] text-white px-4 py-3 rounded-full shadow-lg hover:bg-[#4a2482] transition duration-300 flex items-center space-x-2 animate-pulse';
        }
        
        // Remove all event listeners first
        this.removeAllEditEventListeners();
        
        // Remove editable attributes
        this.removeEditableAttributes();
        
        // Remove image edit functionality
        this.removeImageEditability();
        
        // Hide controls
        this.hideControls();
        
        // Remove edit mode class from body
        document.body.classList.remove('edit-mode-active');
        
        // Remove leftover styles
        this.removeEditStyles();
        
        // Update state
        this.isEditMode = false;
        
        this.showMessage('Edit mode disabled', 'info');
        console.log("Edit mode fully disabled");
    }
    
    // TEXT EDITING FUNCTIONS
   makeContentEditable() {
    // Select elements that should be editable
    const selectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'span', 'div.text-content, div.content',
        '.banner-title', '.banner-tagline',
        '.section-title', '.section-content',
        'main p', 'main h1', 'main h2', 'main h3',
        '#mission-vision p', '#mission-vision h3',
        '#upcoming-events h2', '#upcoming-events h3',
        '#featured-projects h2', '#featured-projects h3',
        
        // Add calendar-specific selectors
        '.calendar-title', '.calendar-header', 
        '.calendar-event-title', '.calendar-event-description',
        '.calendar-event-date', '.calendar-event-time',
        '.calendar-event-location', '.calendar-cell',
        '[data-calendar-event]', '[data-event-date]',
        '.fc-event-title', '.fc-event-time', '.fc-event-description',
        '.event-title', '.event-date', '.event-description',
        '.event-location', '.event-time',
        '.fc-title', '.fc-desc', '.fc-location'
    ];
    
    selectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!this.shouldSkipElement(element)) {
                    this.makeElementEditable(element);
                }
            });
        } catch (error) {
            console.log(`Error processing selector ${selector}:`, error);
        }
    });
}


makeCalendarEditable() {
    console.log("Making calendar editable - Checking permissions...");
    
    // Only proceed if user is admin or faculty
    if (!this.isAdminUser) {
        console.log("User doesn't have permission to edit calendar");
        return;
    }
    
    // Make calendar elements editable
    const calendarSelectors = [
        '#current-month-year',
        '.calendar-day-cell',
        '#upcoming-events-list h4',
        '#upcoming-events-list span',
        '.event-register-btn'
    ];
    
    calendarSelectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!this.shouldSkipElement(element) && element.textContent.trim()) {
                    this.makeElementEditable(element);
                }
            });
        } catch (error) {
            console.log(`Error processing calendar selector ${selector}:`, error);
        }
    });
    
    // Make day cells clickable for editing in edit mode
    if (this.isEditMode && this.isAdminUser) {
        document.querySelectorAll('.calendar-day-cell').forEach(cell => {
            cell.classList.add('editable-calendar-cell');
            cell.style.cursor = 'pointer';
            
            cell.addEventListener('mouseenter', () => {
                if (this.isEditMode) {
                    cell.style.backgroundColor = 'rgba(90, 44, 157, 0.05)';
                    cell.style.borderColor = '#5A2C9D';
                }
            });
            
            cell.addEventListener('mouseleave', () => {
                if (this.isEditMode) {
                    cell.style.backgroundColor = '';
                    cell.style.borderColor = '';
                }
            });
            
            // Override the calendar's click handler in edit mode
            const originalClick = cell.onclick;
            cell.onclick = null;
            
            cell.addEventListener('click', (e) => {
                if (this.isEditMode && this.isAdminUser) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Get the day number
                    const day = cell.dataset.day;
                    if (day) {
                        // Open edit interface for this day
                        this.openCalendarDayEditor(day);
                    }
                }
            });
        });
    }
}


openCalendarDayEditor(day) {
    alert(`Edit calendar day ${day}\n\nIn edit mode, you can:\n1. Add/remove events\n2. Edit event details\n3. Change day text\n\nThis would open an edit interface for the day.`);
}


enableCalendarEditing(calendarElement) {
    // Make all text in calendar editable
    const textElements = calendarElement.querySelectorAll(
        'h1, h2, h3, h4, h5, h6, p, span, div, td, th, li'
    );
    
    textElements.forEach(element => {
        if (!this.shouldSkipElement(element) && 
            element.textContent.trim().length > 0 &&
            !element.closest('button') &&
            !element.closest('input') &&
            !element.closest('select')) {
            this.makeElementEditable(element);
        }
    });
    
    // Make calendar events clickable for editing
    const events = calendarElement.querySelectorAll(
        '.fc-event, .calendar-event, .event-item, [data-event]'
    );
    
    events.forEach((event, index) => {
        this.makeCalendarEventEditable(event, index);
    });
    
    console.log(`Enabled editing for calendar with ${textElements.length} text elements and ${events.length} events`);
}
    
    shouldSkipElement(element) {
        return element.closest('header') || 
               element.closest('footer') || 
               element.closest('nav') ||
               element.closest('.dropdown') ||
               element.hasAttribute('contenteditable') ||
               element.classList.contains('editable-element');
    }

    openEventEditor(eventElement) {
    console.log("Opening event editor for:", eventElement);
    
    // Get event data
    const title = eventElement.querySelector('.event-title, .fc-title, h3, h4')?.textContent || 'Event';
    const date = eventElement.querySelector('.event-date, .fc-date, [data-date]')?.textContent || '';
    const time = eventElement.querySelector('.event-time, .fc-time, [data-time]')?.textContent || '';
    const location = eventElement.querySelector('.event-location, .fc-location, [data-location]')?.textContent || '';
    const description = eventElement.querySelector('.event-description, .fc-desc, p')?.textContent || '';
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900">Edit Calendar Event</h3>
                    <button id="close-event-editor" class="text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                        <input type="text" id="event-title" 
                               value="${title}"
                               class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent" 
                               placeholder="Event title">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input type="date" id="event-date" 
                                   value="${this.extractDate(date)}"
                                   class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Time</label>
                            <input type="time" id="event-time" 
                                   value="${this.extractTime(time)}"
                                   class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input type="text" id="event-location" 
                               value="${location}"
                               class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent" 
                               placeholder="Event location">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea id="event-description" 
                               class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent h-32"
                               placeholder="Event description">${description}</textarea>
                    </div>
                </div>
                
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" id="cancel-event-edit" 
                            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                        Cancel
                    </button>
                    <button type="button" id="save-event-changes" 
                            class="px-4 py-2 bg-[#5A2C9D] text-white rounded-lg hover:bg-[#4a2482] transition-colors duration-200 flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Save Event
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    this.setupEventEditorEvents(modal, eventElement);
}

setupEventEditorEvents(modal, eventElement) {
    const closeBtn = modal.querySelector('#close-event-editor');
    const cancelBtn = modal.querySelector('#cancel-event-edit');
    const saveBtn = modal.querySelector('#save-event-changes');
    
    const closeModal = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    saveBtn.addEventListener('click', () => {
        this.saveEventChanges(modal, eventElement);
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.contains(modal)) {
            closeModal();
        }
    });
}

async saveEventChanges(modal, eventElement) {
    const titleInput = modal.querySelector('#event-title');
    const dateInput = modal.querySelector('#event-date');
    const timeInput = modal.querySelector('#event-time');
    const locationInput = modal.querySelector('#event-location');
    const descriptionInput = modal.querySelector('#event-description');
    const saveBtn = modal.querySelector('#save-event-changes');
    
    // Disable save button during processing
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = `
        <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Saving...
    `;
    saveBtn.disabled = true;
    
    try {
        // Update event element with new values
        const titleEl = eventElement.querySelector('.event-title, .fc-title, h3, h4');
        const dateEl = eventElement.querySelector('.event-date, .fc-date, [data-date]');
        const timeEl = eventElement.querySelector('.event-time, .fc-time, [data-time]');
        const locationEl = eventElement.querySelector('.event-location, .fc-location, [data-location]');
        const descEl = eventElement.querySelector('.event-description, .fc-desc, p');
        
        if (titleEl) titleEl.textContent = titleInput.value;
        if (dateEl) dateEl.textContent = dateInput.value;
        if (timeEl) timeEl.textContent = timeInput.value;
        if (locationEl) locationEl.textContent = locationInput.value;
        if (descEl) descEl.textContent = descriptionInput.value;
        
        // Here you would save to your database
        // Example: await this.saveEventToDatabase(eventData);
        
        // Close modal
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
        
        this.showMessage('✅ Event updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving event:', error);
        this.showMessage(`❌ Error: ${error.message}`, 'error');
        
        // Re-enable save button
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

extractDate(dateString) {
    // Try to extract date from various formats
    if (!dateString) return '';
    
    // Look for common date patterns
    const dateMatch = dateString.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{1,2}\s+\w+\s+\d{4})/);
    if (dateMatch) {
        return new Date(dateMatch[0]).toISOString().split('T')[0];
    }
    
    return '';
}

extractTime(timeString) {
    // Try to extract time from various formats
    if (!timeString) return '';
    
    // Look for common time patterns
    const timeMatch = timeString.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (timeMatch) {
        let time = timeMatch[0];
        // Convert to 24-hour format if needed
        if (time.includes('PM') && !time.includes('12')) {
            const [hours, minutes] = time.split(':');
            time = `${parseInt(hours) + 12}:${minutes}`;
        }
        return time.replace(/\s*(AM|PM)/i, '');
    }
    
    return '';
}

    makeCalendarEventEditable(eventElement, index) {
    // Add editable class
    eventElement.classList.add('editable-event');
    eventElement.dataset.eventIndex = index;
    
    // Add click handler for event editing
    const clickHandler = (e) => {
        if (this.isEditMode) {
            e.preventDefault();
            e.stopPropagation();
            this.openEventEditor(eventElement);
        }
    };
    
    eventElement.addEventListener('click', clickHandler);
    
    // Store reference for removal
    eventElement._editClickHandler = clickHandler;
    
    // Add hover effect
    eventElement.style.cursor = 'pointer';
    eventElement.style.transition = 'all 0.2s ease';
    
    const originalBorder = eventElement.style.border || 'none';
    eventElement.addEventListener('mouseenter', () => {
        if (this.isEditMode) {
            eventElement.style.border = '2px dashed #5A2C9D';
            eventElement.style.backgroundColor = 'rgba(90, 44, 157, 0.1)';
        }
    });
    
    eventElement.addEventListener('mouseleave', () => {
        if (this.isEditMode) {
            eventElement.style.border = originalBorder;
            eventElement.style.backgroundColor = '';
        }
    });
}
    
    makeElementEditable(element) {
        // Store original content
        if (!element.dataset.originalContent) {
            element.dataset.originalContent = element.innerHTML;
        }
        
        // Store original text for database
        if (!element.dataset.originalText) {
            element.dataset.originalText = element.textContent;
        }
        
        // Make editable
        element.setAttribute('contenteditable', 'true');
        element.classList.add('editable-element');
        
        // Add focus styling
        element.addEventListener('focus', () => {
            element.style.outline = '2px solid #6366f1';
            element.style.background = 'rgba(99, 102, 241, 0.1)';
        });
        
        element.addEventListener('blur', () => {
            element.style.outline = '2px dashed #6366f1';
            element.style.background = 'rgba(99, 102, 241, 0.05)';
        });
        
        this.editableElements.push(element);
    }
    
    // IMAGE EDITING FUNCTIONS
    makeImagesEditable() {
        // Select all images on home page (excluding icons, avatars, etc.)
        const imageSelectors = [
            '#mainPageCarousel img',
            '#upcoming-events .grid > div img',
            '#featured-projects .grid > div img',
            'header img:not([src*="icon"]):not([src*="Icon"])',
            'footer img:not([src*="icon"]):not([src*="Icon"])',
            'main img:not([src*="icon"]):not([src*="Icon"])'
        ];
        
        imageSelectors.forEach(selector => {
            try {
                const images = document.querySelectorAll(selector);
                images.forEach((img, index) => {
                    this.makeImageEditable(img, index);
                });
            } catch (error) {
                console.log(`Error processing image selector ${selector}:`, error);
            }
        });
    }
    
    makeImageEditable(imgElement, index) {
        const container = imgElement.closest('.relative') || 
                         imgElement.closest('div') || 
                         imgElement.parentElement;
        
        if (!container) return;
        
        container.classList.add('editable-image');
        container.dataset.imageIndex = index;
        container.dataset.originalSrc = imgElement.src;
        
        // Add click handler
        const clickHandler = (e) => {
            if (this.isEditMode) {
                e.preventDefault();
                e.stopPropagation();
                this.openImageEditor(imgElement, container);
            }
        };
        
        container.addEventListener('click', clickHandler);
        
        // Store reference for removal
        container._editClickHandler = clickHandler;
        
        this.editableImages.push({
            element: imgElement,
            container: container,
            index: index,
            clickHandler: clickHandler
        });
    }
    
   removeAllEditEventListeners() {
    console.log("Removing all edit event listeners");
    
    // Remove click events from image containers
    this.editableImages.forEach(item => {
        if (item.container && item.clickHandler) {
            try {
                item.container.removeEventListener('click', item.clickHandler);
            } catch (error) {
                console.warn('Error removing event listener:', error);
            }
            delete item.container._editClickHandler;
        }
    });
    
    // Remove click events from control buttons
    document.querySelectorAll('[data-edit-listener]').forEach(element => {
        try {
            const newElement = element.cloneNode(true);
            if (element.parentNode) {
                element.parentNode.replaceChild(newElement, element);
            }
        } catch (error) {
            console.warn('Could not replace element with listener:', error);
        }
    });
}
    removeImageEditability() {
    this.editableImages.forEach(item => {
        if (item.container && item.container.parentNode) {
            try {
                item.container.classList.remove('editable-image');
                item.container.removeAttribute('data-image-index');
                item.container.removeAttribute('data-original-src');
                
                // Remove stored handler reference
                delete item.container._editClickHandler;
            } catch (error) {
                console.warn('Error removing image editability:', error);
            }
        }
    });
    
    this.editableImages = [];
}
    openImageEditor(imgElement, container) {
        console.log("Opening image editor for:", imgElement.src);
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4 image-edit-dialog';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-gray-900">Edit Image</h3>
                        <button id="close-image-editor" class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Current Image</label>
                        <div class="border rounded-lg p-4 bg-gray-50">
                            <img src="${imgElement.src}" 
                                 alt="${imgElement.alt || 'Current image'}" 
                                 class="max-h-48 mx-auto rounded-lg">
                            <p class="text-xs text-gray-500 text-center mt-2 truncate">${this.getImageName(imgElement.src)}</p>
                        </div>
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Replace Image</label>
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#5A2C9D] transition-colors duration-200"
                             id="image-drop-zone">
                            <input type="file" id="image-upload-input" accept="image/*" class="hidden">
                            <div class="space-y-3">
                                <svg class="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <div>
                                    <p class="text-gray-600 font-medium">Click to upload or drag & drop</p>
                                    <p class="text-sm text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                                </div>
                            </div>
                        </div>
                        <div id="image-preview" class="mt-4 hidden">
                            <p class="text-sm font-medium text-gray-700 mb-2">New Image Preview:</p>
                            <img id="preview-image" class="max-h-48 w-auto mx-auto rounded-lg border shadow-sm">
                        </div>
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Alternative Text</label>
                        <input type="text" id="image-alt-text" 
                               value="${imgElement.alt || ''}"
                               class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent" 
                               placeholder="Describe the image for accessibility">
                        <p class="text-xs text-gray-500 mt-1">This text is read by screen readers</p>
                    </div>
                    
                    <div class="flex justify-end gap-3">
                        <button type="button" id="cancel-image-edit" 
                                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                            Cancel
                        </button>
                        <button type="button" id="save-image-changes" 
                                class="px-4 py-2 bg-[#5A2C9D] text-white rounded-lg hover:bg-[#4a2482] transition-colors duration-200 flex items-center">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup event listeners
        this.setupImageEditorEvents(modal, imgElement, container);
    }
    
    setupImageEditorEvents(modal, imgElement, container) {
        const dropZone = modal.querySelector('#image-drop-zone');
        const fileInput = modal.querySelector('#image-upload-input');
        const previewDiv = modal.querySelector('#image-preview');
        const previewImg = modal.querySelector('#preview-image');
        const closeBtn = modal.querySelector('#close-image-editor');
        const cancelBtn = modal.querySelector('#cancel-image-edit');
        const saveBtn = modal.querySelector('#save-image-changes');
        
        // Click to upload
        dropZone.addEventListener('click', () => fileInput.click());
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-[#5A2C9D]', 'bg-purple-50');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-[#5A2C9D]', 'bg-purple-50');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-[#5A2C9D]', 'bg-purple-50');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                this.previewImage(files[0], previewImg, previewDiv);
            }
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.previewImage(e.target.files[0], previewImg, previewDiv);
            }
        });
        
        // Close button
        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Save button
        saveBtn.addEventListener('click', async () => {
            await this.saveImageChanges(modal, imgElement, container);
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && document.body.contains(modal)) {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        
        document.addEventListener('keydown', escapeHandler);
        
        // Clean up escape handler when modal closes
        modal.addEventListener('modalClosed', () => {
            document.removeEventListener('keydown', escapeHandler);
        });
    }
    
    previewImage(file, previewImg, previewDiv) {
        // Validate file size
        if (file.size > 5 * 1024 * 1024) {
            this.showMessage('File size must be less than 5MB', 'error');
            return;
        }
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            this.showMessage('Please upload a valid image file (JPG, PNG, GIF, WebP)', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewDiv.classList.remove('hidden');
            previewDiv.classList.add('animate-pulse');
            
            // Stop animation after load
            previewImg.onload = () => {
                previewDiv.classList.remove('animate-pulse');
            };
        };
        reader.readAsDataURL(file);
    }
    
    getImageName(src) {
        const url = new URL(src, window.location.origin);
        return url.pathname.split('/').pop() || 'image';
    }
    
    async saveImageChanges(modal, imgElement, container) {
        const fileInput = modal.querySelector('#image-upload-input');
        const altText = modal.querySelector('#image-alt-text').value.trim();
        const saveBtn = modal.querySelector('#save-image-changes');
        
        // Disable save button during processing
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = `
            <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Saving...
        `;
        saveBtn.disabled = true;
        
        try {
            let newImageUrl = imgElement.src;
            let imageName = this.getImageName(imgElement.src);
            
            // Upload to Supabase if new image selected
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const timestamp = Date.now();
                const fileExt = file.name.split('.').pop().toLowerCase();
                imageName = `home-${timestamp}.${fileExt}`;
                
                console.log('Uploading image to Supabase:', imageName);
                
                // Upload to Supabase Storage
                const { data, error } = await supabase.storage
                    .from('Uploads')
                    .upload(imageName, file, {
                        upsert: true,
                        cacheControl: '3600',
                        contentType: file.type
                    });
                
                if (error) {
                    if (error.message.includes('bucket')) {
                        throw new Error('Uploads bucket not found. Please create it in Supabase Storage.');
                    }
                    throw error;
                }
                
                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('Uploads')
                    .getPublicUrl(imageName);
                
                newImageUrl = urlData.publicUrl + `?t=${timestamp}`;
                
                console.log('Image uploaded successfully:', imageName);
            }
            
            // Update image on page immediately
            imgElement.src = newImageUrl;
            imgElement.alt = altText || '';
            
            // Get section and position for database
            const { section, position } = this.getImageSectionAndPosition(imgElement);
            
            if (!section || !position) {
                throw new Error('Could not determine image location on page');
            }
            
            console.log('Image location:', { section, position, imageUrl: newImageUrl });
            
            // Save to database for persistence
            await this.saveImageToDatabase(section, position, newImageUrl);
            
            // Close modal
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            
            // Show success message
            this.showMessage('✅ Image saved successfully! Changes are permanent.', 'success');
            
        } catch (error) {
            console.error('Error saving image:', error);
            this.showMessage(`❌ Error: ${error.message}`, 'error');
            
            // Re-enable save button
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
    
    async saveImageToDatabase(sectionId, position, imageUrl) {
        console.log('Saving image to database - Parameters:', {
            sectionId: sectionId,
            position: position,
            imageUrl: imageUrl,
            'typeof sectionId': typeof sectionId,
            'typeof position': typeof position
        });

        // Validate parameters
        if (typeof sectionId !== 'string' || sectionId.trim() === '') {
            throw new Error(`Invalid sectionId: ${sectionId}. Expected a string.`);
        }
        
        const pos = parseInt(position);
        if (isNaN(pos)) {
            throw new Error(`Invalid position: ${position}. Expected a number.`);
        }
        
        if (typeof imageUrl !== 'string' || imageUrl.trim() === '') {
            throw new Error(`Invalid imageUrl: ${imageUrl}`);
        }

        try {
            // Check if a record already exists
            const { data: existingRecord, error: fetchError } = await supabase
                .from('home_image_assignments')
                .select('id, image_name, alt_text, link_url')
                .eq('page_section', sectionId)
                .eq('position', pos)
                .maybeSingle();

            if (fetchError) {
                console.error('Error checking existing record:', fetchError);
            }

            console.log('Existing record:', existingRecord);

            // Extract just the filename from the URL if it's a full URL
            let imageName = imageUrl;
            if (imageUrl.includes('/')) {
                // Get the last part of the URL (filename)
                imageName = imageUrl.split('/').pop();
                console.log('Extracted filename:', imageName);
            }

            // Prepare data with CORRECT column names from your database
            const dataToSave = {
                page_section: sectionId,
                position: pos,
                image_name: imageName,  // CORRECT COLUMN NAME
                updated_at: new Date().toISOString()
            };

            // Preserve existing alt_text and link_url if they exist
            if (existingRecord) {
                dataToSave.id = existingRecord.id;
                dataToSave.alt_text = existingRecord.alt_text || '';
                dataToSave.link_url = existingRecord.link_url || '';
            } else {
                // Set defaults for new records
                dataToSave.alt_text = '';
                dataToSave.link_url = '';
            }

            console.log('Data to save:', dataToSave);

            // Upsert the data
            const { data, error } = await supabase
                .from('home_image_assignments')
                .upsert(dataToSave, {
                    onConflict: 'page_section,position'
                })
                .select();

            if (error) {
                console.error('Supabase upsert error:', error);
                throw new Error(`Database error: ${error.message}`);
            }

            console.log('Save successful:', data);
            return data[0];

        } catch (error) {
            console.error('Database save error:', error);
            throw new Error(`Failed to save to database: ${error.message}. Image may not persist after refresh.`);
        }
    }
    
    getImageSectionAndPosition(imgElement) {
        console.log('Getting section and position for image:', imgElement.src);
        
        // Get all possible parent containers
        const parents = [];
        let parent = imgElement.parentElement;
        while (parent && parents.length < 5) {
            parents.push(parent);
            parent = parent.parentElement;
        }
        
        console.log('Parent elements:', parents.map(p => p.tagName + (p.className ? '.' + p.className : '')));
        
        // Check carousel
        const carouselItem = imgElement.closest('.carousel-item');
        if (carouselItem) {
            const carouselItems = document.querySelectorAll('#mainPageCarousel .carousel-item');
            const position = Array.from(carouselItems).indexOf(carouselItem) + 1;
            console.log('Found in carousel, position:', position);
            return { section: 'carousel', position };
        }
        
        // Check news section (upcoming-events)
        const newsSection = document.getElementById('upcoming-events');
        if (newsSection && newsSection.contains(imgElement)) {
            const newsCards = newsSection.querySelectorAll('.grid > div, .news-card, [class*="card"]');
            for (let i = 0; i < newsCards.length; i++) {
                if (newsCards[i].contains(imgElement)) {
                    console.log('Found in news section, position:', i + 1);
                    return { section: 'news', position: i + 1 };
                }
            }
        }
        
        // Check featured projects
        const projectsSection = document.getElementById('featured-projects');
        if (projectsSection && projectsSection.contains(imgElement)) {
            const projectCards = projectsSection.querySelectorAll('.grid > div, .project-card, [class*="card"]');
            for (let i = 0; i < projectCards.length; i++) {
                if (projectCards[i].contains(imgElement)) {
                    console.log('Found in projects section, position:', i + 1);
                    return { section: 'featured-projects', position: i + 1 };
                }
            }
        }
        
        // Check logo
        if (imgElement.src.includes('logo') || 
            imgElement.closest('header') || 
            imgElement.closest('footer') ||
            imgElement.alt.toLowerCase().includes('logo')) {
            console.log('Found logo');
            return { section: 'logo', position: 1 };
        }
        
        // Default fallback
        console.warn('Could not determine section, using defaults');
        return { section: 'unknown', position: 1 };
    }
    
  removeEditableAttributes() {
    // Create a copy of the array since we'll be modifying it
    const elementsToProcess = [...this.editableElements];
    
    elementsToProcess.forEach(element => {
        // Check if element still exists in the DOM
        if (element && element.parentNode) {
            // Remove editable attributes
            element.removeAttribute('contenteditable');
            element.classList.remove('editable-element');
            element.style.outline = '';
            element.style.outlineOffset = '';
            element.style.padding = '';
            element.style.minHeight = '';
            element.style.background = '';
            
            // Clone and replace to remove event listeners
            try {
                const newElement = element.cloneNode(true);
                if (element.parentNode) {
                    element.parentNode.replaceChild(newElement, element);
                }
            } catch (error) {
                console.warn('Could not replace element:', error);
                // If cloning fails, just remove the editable attributes
            }
        }
    });
    
    this.editableElements = [];
    
    document.querySelectorAll('.editable-calendar-cell').forEach(cell => {
        cell.classList.remove('editable-calendar-cell');
        cell.style.cursor = '';
        cell.style.backgroundColor = '';
        cell.style.borderColor = '';
    });
    document.querySelectorAll('.editable-event').forEach(event => {
        event.classList.remove('editable-event');
        event.removeAttribute('data-event-index');
        event.style.cursor = '';
        event.style.border = '';
        event.style.backgroundColor = '';
        
        if (event._editClickHandler) {
            event.removeEventListener('click', event._editClickHandler);
            delete event._editClickHandler;
        }
    });
}
    
    removeEditStyles() {
        // Remove inline styles added during edit mode
        document.querySelectorAll('.editable-element').forEach(element => {
            element.style.outline = '';
            element.style.outlineOffset = '';
            element.style.padding = '';
            element.style.minHeight = '';
            element.style.background = '';
            element.style.cursor = '';
        });
        
        // Remove hover styles
        const styleElement = document.querySelector('style[data-edit-styles]');
        if (styleElement) {
            styleElement.remove();
        }
    }
    
  showControls() {
    // Remove existing controls
    this.hideControls();
    
    // Create controls
    this.controls = document.createElement('div');
    this.controls.id = 'edit-controls';
    this.controls.className = 'fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-white shadow-xl rounded-lg p-4 border border-gray-200 flex space-x-3';
    this.controls.innerHTML = `
        <button id="save-all-changes" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center transition duration-200 shadow">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Save All Text
        </button>
        <button id="cancel-all-edit" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center transition duration-200 shadow">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Cancel
        </button>
        <button id="exit-edit-mode" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center transition duration-200 shadow">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Exit Edit Mode
        </button>
    `;
    
    document.body.appendChild(this.controls);
    
    // Add event listeners
    const saveBtn = document.getElementById('save-all-changes');
    const cancelBtn = document.getElementById('cancel-all-edit');
    const exitBtn = document.getElementById('exit-edit-mode');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveAllTextChanges());
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.cancelAllChanges());
    }
    
    if (exitBtn) {
        exitBtn.addEventListener('click', () => this.disableEditMode());
    }
}
    
    hideControls() {
        if (this.controls && this.controls.parentNode) {
            this.controls.remove();
            this.controls = null;
        }
    }
    
    async saveAllTextChanges() {
        if (!confirm('Save all text changes to database?')) return;
        
        const saveBtn = document.getElementById('save-all-changes');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = `
            <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Saving...
        `;
        saveBtn.disabled = true;
        
        try {
            const changes = [];
            
            // Collect changes
            this.editableElements.forEach(element => {
                const original = element.dataset.originalText || '';
                const current = element.textContent.trim();
                
                if (original !== current && current.length > 0) {
                    changes.push({
                        element_id: element.id || element.className || 'untitled',
                        original: original,
                        new: current,
                        html: element.innerHTML
                    });
                    
                    // Update stored original
                    element.dataset.originalText = current;
                }
            });
            
            if (changes.length > 0) {
                console.log('Text changes to save:', changes);
                
                // Here you would save to your database
                // For now, we'll just show a success message
                
                this.showMessage(`✅ ${changes.length} text changes saved!`, 'success');
            } else {
                this.showMessage('No text changes were made', 'info');
            }
            
            // Re-enable button
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            
            // Exit edit mode after save
            setTimeout(() => {
                this.disableEditMode();
            }, 1500);
            
        } catch (error) {
            console.error('Error saving text:', error);
            this.showMessage('❌ Error saving text changes', 'error');
            
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
    
    cancelAllChanges() {
        if (!confirm('Cancel all changes and revert to original?')) return;
        
        // Revert text changes
        this.editableElements.forEach(element => {
            const original = element.dataset.originalContent;
            if (original) {
                element.innerHTML = original;
                element.textContent = element.dataset.originalText || '';
            }
        });
        
        // Revert image changes by reloading page
        this.showMessage('Changes reverted. Page will reload...', 'warning');
        
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
    
    showMessage(text, type = 'info') {
        // Remove existing message
        const existing = document.getElementById('edit-message');
        if (existing) existing.remove();
        
        // Create message
        const message = document.createElement('div');
        message.id = 'edit-message';
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        const icons = {
            success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            error: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z',
            info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        };
        
        message.className = `fixed top-6 left-1/2 transform -translate-x-1/2 z-[1001] ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2`;
        message.innerHTML = `
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${icons[type]}"></path>
            </svg>
            <span class="font-medium">${text}</span>
        `;
        
        document.body.appendChild(message);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 4000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        if (!window.editMode) {
            window.editMode = new EditModeManager();
        }
    }, 1000);
});

// Make available globally
export default EditModeManager;
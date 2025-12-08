// news-events-calendar.js
// news-events-calendar.js
import { supabase } from './db_connection.js'; // This now imports the standard Supabase client

class NewsEventsCalendar {
    constructor() {
        this.currentDate = new Date();
        this.events = [];
        this.currentUser = null;
        this.userRole = 'guest';
        this.init();
    }
    
    async init() {
        console.log("Initializing News & Events calendar...");
        await this.checkUserAuth();
        await this.loadEvents();
        this.renderCalendar();
        this.setupEventListeners();
        this.setupEditButtons();
    }
    
    async checkUserAuth() {
        try {
            // Check localStorage for user role first
            const storedUserRole = localStorage.getItem('userRole');
            const storedUser = localStorage.getItem('user');
            
            if (storedUserRole && storedUser) {
                this.userRole = storedUserRole;
                this.currentUser = JSON.parse(storedUser);
                console.log(`Calendar user: ${this.currentUser.full_name}, Role: ${this.userRole}`);
            } else {
                // No user logged in
                this.userRole = 'guest';
                console.log('Calendar user: Guest');
            }
            
            // Update UI based on role
            this.updateUserInterface();
            
        } catch (error) {
            console.error("Error checking user auth:", error);
            this.userRole = 'guest';
            this.updateUserInterface();
        }
    }
    
    canEditCalendar() {
        return this.userRole === 'admin' || this.userRole === 'faculty';
    }
    
    canAddEvents() {
        return this.userRole === 'admin' || this.userRole === 'faculty' || this.userRole === 'coordinator';
    }
    
    canDeleteEvents() {
        return this.userRole === 'admin' || this.userRole === 'faculty';
    }
    
    updateUserInterface() {
        // Update user status display
        const userStatus = document.getElementById('user-status');
        const userRoleBadge = document.getElementById('user-role-badge');
        const currentRole = document.getElementById('current-role');
        
        if (userStatus) {
            if (this.userRole !== 'guest') {
                userStatus.textContent = this.userRole.charAt(0).toUpperCase() + this.userRole.slice(1);
                if (userRoleBadge) {
                    userRoleBadge.textContent = this.userRole;
                    userRoleBadge.className = `user-role-indicator role-${this.userRole}`;
                    userRoleBadge.classList.remove('hidden');
                }
                if (currentRole) currentRole.textContent = this.userRole;
            } else {
                userStatus.textContent = 'Guest';
                if (userRoleBadge) userRoleBadge.classList.add('hidden');
                if (currentRole) currentRole.textContent = 'Guest';
            }
        }
        
        // Show/hide edit buttons
        this.toggleEditButtons();
    }
    
    toggleEditButtons() {
        const canEdit = this.canEditCalendar();
        const editButtons = document.querySelectorAll('.edit-event-btn');
        
        editButtons.forEach(btn => {
            if (canEdit) {
                btn.classList.remove('hidden');
                btn.classList.add('flex', 'visible');
            } else {
                btn.classList.add('hidden');
                btn.classList.remove('flex', 'visible');
            }
        });
        
        // Update add event button
        const addEventBtn = document.getElementById('add-event-btn');
        if (addEventBtn) {
            addEventBtn.style.display = this.canAddEvents() ? 'flex' : 'none';
        }
    }
    
    async loadEvents() {
        try {
            const { data, error } = await supabase
                .from('calendar_events')
                .select('*')
                .order('event_date')
                .order('start_time');
            
            if (error) throw error;
            
            this.events = data || [];
            console.log(`Loaded ${this.events.length} calendar events`);
            
        } catch (error) {
            console.error("Error loading calendar events:", error);
            this.events = [];
        }
    }
    
    renderCalendar() {
        const monthYearEl = document.getElementById('current-month-year');
        const gridEl = document.getElementById('calendar-grid');
        const upcomingEventsEl = document.getElementById('upcoming-events-list');
        
        if (!monthYearEl || !gridEl) return;
        
        // Update month/year display
        const monthNames = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"];
        monthYearEl.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        
        // Clear previous days
        gridEl.innerHTML = '';
        
        // Get calendar data
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const totalDays = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        // Add empty cells
        for (let i = 0; i < startingDay; i++) {
            const emptyCell = this.createEmptyDayCell();
            gridEl.appendChild(emptyCell);
        }
        
        // Add days 1-31
        const today = new Date();
        const isCurrentMonth = today.getMonth() === this.currentDate.getMonth() && 
                               today.getFullYear() === this.currentDate.getFullYear();
        
        for (let day = 1; day <= totalDays; day++) {
            const dayCell = this.createDayCell(day, isCurrentMonth && day === today.getDate());
            gridEl.appendChild(dayCell);
        }
        
        // Update upcoming events
        this.updateUpcomingEvents(upcomingEventsEl);
    }
    
    createEmptyDayCell() {
        const cell = document.createElement('div');
        cell.className = 'h-24 p-1 border border-gray-100 rounded-lg bg-gray-50';
        return cell;
    }
    
    createDayCell(day, isToday) {
        const cell = document.createElement('div');
        cell.className = `h-24 p-2 border rounded-lg transition-colors duration-200 calendar-day-cell ${isToday ? 'bg-blue-50 border-blue-300' : 'border-gray-100 hover:border-purple-200 hover:bg-gray-50'}`;
        cell.dataset.day = day;
        cell.dataset.month = this.currentDate.getMonth() + 1;
        cell.dataset.year = this.currentDate.getFullYear();
        
        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = `font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`;
        dayNumber.textContent = day;
        cell.appendChild(dayNumber);
        
        // Events for this day
        const eventsForDay = this.getEventsForDay(day);
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'space-y-1 overflow-y-auto max-h-16';
        
        eventsForDay.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = 'event-item relative text-xs px-2 py-1 rounded bg-[#5A2C9D]/10 text-[#5A2C9D] font-medium truncate cursor-pointer hover:bg-[#5A2C9D]/20 transition-colors group';
            eventEl.title = `${event.title} - ${event.start_time}`;
            eventEl.textContent = event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title;
            eventEl.dataset.eventId = event.id;
            
            // Add edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-event-btn event-controls absolute -top-1 -right-1 items-center justify-center w-5 h-5 bg-white rounded-full shadow-sm border border-gray-300 hover:border-[#5A2C9D] hover:bg-gray-50 transition';
            editBtn.innerHTML = `
                <svg class="w-3 h-3 text-gray-500 hover:text-[#5A2C9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                    </path>
                </svg>
            `;
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEventEditor(event.id);
            });
            
            eventEl.appendChild(editBtn);
            
            // Only allow editing if user has permission
            if (this.canEditCalendar()) {
                eventEl.addEventListener('click', (e) => {
                    if (e.target === eventEl) {
                        this.openEventDetails(event.id);
                    }
                });
            } else {
                eventEl.style.cursor = 'default';
                eventEl.classList.remove('cursor-pointer', 'hover:bg-[#5A2C9D]/20');
            }
            
            eventsContainer.appendChild(eventEl);
        });
        
        cell.appendChild(eventsContainer);
        
        // Add click handler for the day cell
        if (this.canAddEvents()) {
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', (e) => {
                if (e.target === cell || e.target === dayNumber) {
                    this.openDayEditor(day);
                }
            });
        } else {
            cell.style.cursor = 'default';
        }
        
        return cell;
    }
    
    getEventsForDay(day) {
        const dateStr = `${this.currentDate.getFullYear()}-${(this.currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        return this.events.filter(event => event.event_date === dateStr);
    }
    
    updateUpcomingEvents(container) {
        if (!container) return;
        
        container.innerHTML = '';
        
        // Get events for the next 7 days
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const upcomingEvents = this.events.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate >= today && eventDate <= nextWeek;
        }).slice(0, 3);
        
        if (upcomingEvents.length === 0) {
            container.innerHTML = '<p class="text-gray-500 italic text-center py-4">No upcoming events</p>';
            return;
        }
        
        upcomingEvents.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = 'event-item flex flex-col border-b border-gray-100 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0 relative group';
            
            const eventDate = new Date(event.event_date);
            const day = eventDate.getDate();
            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const month = monthNames[eventDate.getMonth()];
            
            // Add edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-event-btn absolute top-0 right-0 items-center justify-center w-8 h-8 text-gray-500 hover:text-[#5A2C9D] hover:bg-gray-100 rounded-full transition opacity-0 group-hover:opacity-100';
            editBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                    </path>
                </svg>
            `;
            editBtn.addEventListener('click', () => this.openEventEditor(event.id));
            
            eventEl.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-[#5A2C9D] bg-purple-100 px-2 py-1 rounded">${month} ${day}</span>
                    <span class="text-xs text-gray-400">${event.location || 'TBA'}</span>
                </div>
                <h4 class="font-bold text-gray-800 leading-tight mb-2 text-sm">${event.title}</h4>
                <a href="#" class="event-register-btn text-center w-full block ${this.canAddEvents() ? 'bg-white border border-[#5A2C9D] text-[#5A2C9D] hover:bg-[#5A2C9D] hover:text-white' : 'bg-gray-100 border border-gray-300 text-gray-400 cursor-not-allowed'} text-xs font-bold py-2 rounded transition duration-300" 
                   data-event-id="${event.id}">
                    ${this.canAddEvents() ? 'Register Now' : 'Login to Register'}
                </a>
            `;
            
            eventEl.appendChild(editBtn);
            container.appendChild(eventEl);
        });
        
        // Add event listeners
        container.querySelectorAll('.event-register-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const eventId = btn.dataset.eventId;
                if (this.canAddEvents()) {
                    this.openEventRegistration(eventId);
                } else {
                    this.showLoginPrompt();
                }
            });
        });
    }
    
    setupEventListeners() {
        // Month navigation
        document.getElementById('prev-month-btn')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });
        
        document.getElementById('next-month-btn')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });
        
        // Today button
        document.getElementById('today-btn')?.addEventListener('click', () => {
            this.currentDate = new Date();
            this.renderCalendar();
        });
        
        // Add event button
        document.getElementById('add-event-btn')?.addEventListener('click', () => {
            if (this.canAddEvents()) {
                this.openDayEditor(new Date().getDate());
            } else {
                this.showLoginPrompt();
            }
        });
        
        // Setup user dropdown
        const userMenuButton = document.getElementById('user-menu-button');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userMenuButton && userDropdown) {
            userMenuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = !userDropdown.classList.contains('opacity-0');
                
                if (isVisible) {
                    userDropdown.classList.add('opacity-0', 'invisible');
                } else {
                    userDropdown.classList.remove('opacity-0', 'invisible');
                }
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.add('opacity-0', 'invisible');
                }
            });
        }
    }
    
    setupEditButtons() {
        // Add edit buttons to news articles
        this.setupArticleEditButtons();
        // Add edit buttons to gallery items
        this.setupGalleryEditButtons();
        // Update visibility
        this.toggleEditButtons();
    }
    
    setupArticleEditButtons() {
        // Find all news articles and add edit buttons
        const articles = document.querySelectorAll('.flex.flex-col.md\\:flex-row.bg-white.rounded-xl');
        
        articles.forEach((article, index) => {
            if (!article.querySelector('.edit-event-btn')) {
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-event-btn absolute top-3 right-3 z-10 items-center justify-center w-8 h-8 bg-white rounded-full shadow-sm border border-gray-200 hover:border-[#5A2C9D] hover:bg-gray-50 transition';
                editBtn.setAttribute('data-article-id', `article${index + 1}`);
                editBtn.setAttribute('aria-label', 'Edit article');
                editBtn.innerHTML = `
                    <svg class="w-4 h-4 text-gray-500 hover:text-[#5A2C9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                        </path>
                    </svg>
                `;
                
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editArticle(`article${index + 1}`);
                });
                
                article.style.position = 'relative';
                article.appendChild(editBtn);
            }
        });
    }
    
    setupGalleryEditButtons() {
        // Find all gallery items and add edit buttons
        const galleryItems = document.querySelectorAll('.relative.group.rounded-xl');
        
        galleryItems.forEach((item, index) => {
            if (!item.querySelector('.edit-event-btn')) {
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-event-btn absolute top-2 right-2 z-10 items-center justify-center w-8 h-8 bg-white/90 rounded-full shadow-sm hover:bg-white transition opacity-0 group-hover:opacity-100';
                editBtn.setAttribute('data-gallery-id', `gallery${index + 1}`);
                editBtn.setAttribute('aria-label', 'Edit gallery item');
                editBtn.innerHTML = `
                    <svg class="w-4 h-4 text-gray-600 hover:text-[#5A2C9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                        </path>
                    </svg>
                `;
                
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editGalleryItem(`gallery${index + 1}`);
                });
                
                item.appendChild(editBtn);
            }
        });
    }
    
    // ========== MISSING FUNCTIONS THAT NEED TO BE ADDED ==========
    
    setupDayModalEvents(modal, dateStr) {
        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };
        
        // Close buttons
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-modal').addEventListener('click', closeModal);
        
        // Delete event buttons (only if user has permission)
        modal.querySelectorAll('.delete-event-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const eventId = btn.dataset.eventId;
                if (this.canDeleteEvents()) {
                    if (confirm('Are you sure you want to delete this event?')) {
                        await this.deleteEvent(eventId);
                        closeModal();
                        this.renderCalendar();
                    }
                }
            });
        });
        
        // Edit event buttons in the modal
        modal.querySelectorAll('.edit-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = btn.dataset.eventId;
                if (this.canEditCalendar()) {
                    this.openEventEditor(eventId);
                }
            });
        });
        
        // Save new event
        modal.querySelector('#save-new-event').addEventListener('click', async () => {
            await this.saveNewEvent(modal, dateStr);
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
    
    openEventDetails(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        // Show event details in a modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900">Event Details</h3>
                    <button class="close-modal text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <h4 class="text-lg font-bold text-gray-800">${event.title}</h4>
                        <p class="text-gray-600">${event.description || 'No description provided.'}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-500">Date</p>
                            <p class="font-medium">${new Date(event.event_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Time</p>
                            <p class="font-medium">${event.start_time}${event.end_time ? ` - ${event.end_time}` : ''}</p>
                        </div>
                    </div>
                    ${event.location ? `
                    <div>
                        <p class="text-sm text-gray-500">Location</p>
                        <p class="font-medium">${event.location}</p>
                    </div>
                    ` : ''}
                </div>
                <div class="mt-6 pt-6 border-t">
                    <button class="w-full px-4 py-2 bg-[#5A2C9D] text-white rounded-lg hover:bg-[#4a2482]">
                        Register for Event
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    openEventRegistration(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        // Show registration modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900">Register for Event</h3>
                    <button class="close-modal text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="space-y-4">
                    <h4 class="text-lg font-bold text-gray-800">${event.title}</h4>
                    <p class="text-gray-600">${event.description || ''}</p>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-500">Date</p>
                            <p class="font-medium">${new Date(event.event_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Time</p>
                            <p class="font-medium">${event.start_time}</p>
                        </div>
                    </div>
                    ${event.location ? `
                    <div>
                        <p class="text-sm text-gray-500">Location</p>
                        <p class="font-medium">${event.location}</p>
                    </div>
                    ` : ''}
                </div>
                <form class="mt-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input type="text" class="w-full px-3 py-2 border rounded-lg" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input type="email" class="w-full px-3 py-2 border rounded-lg" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input type="text" class="w-full px-3 py-2 border rounded-lg">
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" class="cancel-modal px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 bg-[#5A2C9D] text-white rounded-lg hover:bg-[#4a2482]">
                            Submit Registration
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-modal').addEventListener('click', closeModal);
        modal.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.showMessage('✅ Registration submitted successfully!', 'success');
            closeModal();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // ========== EDIT FUNCTIONS ==========
    
    openEventEditor(eventId) {
        if (!this.canEditCalendar()) {
            this.showLoginPrompt();
            return;
        }
        
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        this.showEditModal('Event', event);
    }
    
    editArticle(articleId) {
        if (!this.canEditCalendar()) {
            this.showLoginPrompt();
            return;
        }
        
        // Find the article element
        const article = document.querySelector(`[data-article-id="${articleId}"]`)?.closest('.flex.flex-col.md\\:flex-row.bg-white.rounded-xl');
        if (!article) return;
        
        const title = article.querySelector('h4')?.textContent || '';
        const date = article.querySelector('.text-sm.text-gray-500')?.textContent?.split('•')[0]?.trim() || '';
        const category = article.querySelector('.text-sm.text-gray-500 span')?.textContent || '';
        const description = article.querySelector('p.text-gray-600')?.textContent || '';
        
        const articleData = {
            id: articleId,
            title: title,
            date: date,
            category: category,
            description: description
        };
        
        this.showEditModal('Article', articleData);
    }
    
    editGalleryItem(galleryId) {
        if (!this.canEditCalendar()) {
            this.showLoginPrompt();
            return;
        }
        
        // Show simple edit modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900">Edit Gallery Item</h3>
                    <button class="close-modal text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <p class="text-gray-600 mb-4">This would open a gallery item editor in a real implementation.</p>
                <div class="flex justify-end">
                    <button class="px-4 py-2 bg-[#5A2C9D] text-white rounded-lg hover:bg-[#4a2482]">
                        Save Changes
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    showEditModal(type, data) {
        // Remove existing modal
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) existingModal.remove();
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        let formFields = '';
        
        if (type === 'Event') {
            formFields = `
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input type="date" name="date" value="${data.event_date || ''}" 
                               class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <input type="time" name="time" value="${data.start_time || ''}" 
                               class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input type="text" name="location" value="${data.location || ''}" 
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent">
                </div>
            `;
        } else if (type === 'Article') {
            formFields = `
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input type="text" name="date" value="${data.date || ''}" 
                               class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <input type="text" name="category" value="${data.category || ''}" 
                               class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent">
                    </div>
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900">Edit ${type}</h3>
                    <button class="close-modal text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input type="text" name="title" value="${data.title || ''}" 
                               class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent" required>
                    </div>
                    
                    ${formFields}
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea name="description" rows="4"
                                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent">${data.description || ''}</textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" class="cancel-edit px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" class="save-edit px-4 py-2 bg-[#5A2C9D] text-white rounded-lg hover:bg-[#4a2482]">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup modal events
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('.cancel-edit').addEventListener('click', () => modal.remove());
        
        modal.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            // In a real implementation, you would save to database here
            this.showMessage('✅ Changes saved successfully!', 'success');
            modal.remove();
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.contains(modal)) {
                modal.remove();
            }
        });
    }

    openDayEditor(day) {
        if (!this.canAddEvents()) {
            this.showLoginPrompt();
            return;
        }
        
        const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
        const dateStr = date.toISOString().split('T')[0];
        const existingEvents = this.getEventsForDay(day);
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-gray-900">
                            ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </h3>
                        <button class="close-modal text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div id="day-events-list" class="mb-6 space-y-3 max-h-48 overflow-y-auto">
                        ${existingEvents.length > 0 ? '' : 
                          '<p class="text-gray-500 italic text-center py-4">No events scheduled for this day.</p>'}
                    </div>
                    
                    <div class="mb-6">
                        <h4 class="text-lg font-bold text-gray-800 mb-4">${this.canEditCalendar() ? 'Add New Event' : 'Request Event (Requires Approval)'}</h4>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
                                <input type="text" id="new-event-title" 
                                       class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent" 
                                       placeholder="Enter event title" required>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                    <input type="time" id="new-event-time" 
                                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">End Time (Optional)</label>
                                    <input type="time" id="new-event-end-time" 
                                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent">
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <input type="text" id="new-event-location" 
                                       class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent" 
                                       placeholder="Event location">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea id="new-event-description" 
                                       class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2C9D] focus:border-transparent h-24"
                                       placeholder="Event description"></textarea>
                            </div>
                            
                            ${!this.canEditCalendar() ? `
                            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p class="text-sm text-yellow-800">
                                    <strong>Note:</strong> As a ${this.userRole}, your event will need approval from an administrator before appearing on the calendar.
                                </p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="flex justify-end gap-3">
                        <button type="button" class="cancel-modal px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                            Cancel
                        </button>
                        <button type="button" id="save-new-event" 
                                class="px-4 py-2 bg-[#5A2C9D] text-white rounded-lg hover:bg-[#4a2482] transition-colors duration-200 flex items-center">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            ${this.canEditCalendar() ? 'Add Event' : 'Submit for Approval'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Populate existing events
        const eventsList = modal.querySelector('#day-events-list');
        existingEvents.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = 'p-3 border rounded-lg bg-gray-50';
            
            // Check if current user can edit/delete this event
            const canEditThisEvent = this.canEditCalendar();
            const canDeleteThisEvent = this.canDeleteEvents();
            
            eventEl.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h5 class="font-bold text-gray-800">${event.title}</h5>
                        <p class="text-sm text-gray-600 mt-1">${event.description || ''}</p>
                        ${event.location ? `<p class="text-xs text-gray-500 mt-1 flex items-center">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            ${event.location}
                        </p>` : ''}
                        <p class="text-xs text-gray-500 mt-1">${event.start_time}${event.end_time ? ` - ${event.end_time}` : ''}</p>
                        ${event.created_by ? `<p class="text-xs text-gray-400 mt-1">Created by: ${event.created_by}</p>` : ''}
                    </div>
                    ${canEditThisEvent || canDeleteThisEvent ? `
                    <div class="flex items-center space-x-2">
                        ${canEditThisEvent ? `
                        <button class="edit-event-btn text-blue-500 hover:text-blue-700" data-event-id="${event.id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        ` : ''}
                        ${canDeleteThisEvent ? `
                        <button class="delete-event-btn text-red-500 hover:text-red-700" data-event-id="${event.id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
            `;
            eventsList.appendChild(eventEl);
        });
        
        // Setup modal event listeners
        this.setupDayModalEvents(modal, dateStr);
    }

    async saveNewEvent(modal, dateStr) {
        const title = modal.querySelector('#new-event-title').value.trim();
        const startTime = modal.querySelector('#new-event-time').value;
        const endTime = modal.querySelector('#new-event-end-time').value;
        const location = modal.querySelector('#new-event-location').value.trim();
        const description = modal.querySelector('#new-event-description').value.trim();
        
        if (!title || !startTime) {
            alert('Please enter at least a title and start time');
            return;
        }
        
        const saveBtn = modal.querySelector('#save-new-event');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = `
            <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            ${this.canEditCalendar() ? 'Saving...' : 'Submitting...'}
        `;
        saveBtn.disabled = true;
        
        try {
            const eventData = {
                title: title,
                event_date: dateStr,
                start_time: startTime,
                end_time: endTime || null,
                location: location || null,
                description: description || null,
                created_by: this.currentUser ? this.currentUser.email : 'Guest',
                status: this.canEditCalendar() ? 'approved' : 'pending', // Pending approval for non-admins
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Save to Supabase
            const { data, error } = await supabase
                .from('calendar_events')
                .insert(eventData)
                .select();
            
            if (error) throw error;
            
            // Add to local events
            this.events.push(data[0]);
            
            // Close modal
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            
            // Refresh calendar
            this.renderCalendar();
            
            // Show appropriate success message
            if (this.canEditCalendar()) {
                this.showMessage('✅ Event added successfully!', 'success');
            } else {
                this.showMessage('✅ Event submitted for approval! An admin will review it.', 'info');
            }
            
        } catch (error) {
            console.error('Error saving event:', error);
            alert('Error saving event: ' + error.message);
            
            // Re-enable save button
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    async deleteEvent(eventId) {
        try {
            const { error } = await supabase
                .from('calendar_events')
                .delete()
                .eq('id', eventId);
            
            if (error) throw error;
            
            // Remove from local events
            this.events = this.events.filter(event => event.id !== eventId);
            
            this.showMessage('✅ Event deleted successfully!', 'success');
            
        } catch (error) {
            console.error('Error deleting event:', error);
            this.showMessage('❌ Error deleting event', 'error');
        }
    }
    
    showLoginPrompt() {
        if (confirm('You need to log in to perform this action. Would you like to login now?')) {
            window.location.href = 'HTML/LogIn.html';
        }
    }
    
    showMessage(text, type = 'info') {
        // Remove existing message
        const existing = document.getElementById('calendar-message');
        if (existing) existing.remove();
        
        // Create message
        const message = document.createElement('div');
        message.id = 'calendar-message';
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        message.className = `fixed bottom-24 right-6 z-[1001] ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg`;
        message.textContent = text;
        
        document.body.appendChild(message);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 3000);
    }
    
    login() {
        // Redirect to login page
        window.location.href = 'HTML/LogIn.html';
    }
}

// Initialize calendar
document.addEventListener('DOMContentLoaded', () => {
    if (!window.newsEventsCalendar) {
        window.newsEventsCalendar = new NewsEventsCalendar();
    }
});

export default NewsEventsCalendar;
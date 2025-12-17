console.log('Programs.js LOADED');

import { supabase } from './db_connection.js';

// Store projects globally for the modal
window.dbProjects = [];

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    // 1. Fetch from Supabase
    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading DB projects:", error);
        return;
    }

    if (!projects || projects.length === 0) return;

    window.dbProjects = projects;

    // 2. Generate HTML
    projects.forEach((proj, index) => {
        // Status Colors
        let badgeColor = 'bg-blue-600'; 
        if (proj.status === 'Ongoing') badgeColor = 'bg-green-500';
        if (proj.status === 'Proposed') badgeColor = 'bg-yellow-500';

        // Format Date for Card (Just Year)
        const startYear = proj.start_date ? new Date(proj.start_date).getFullYear() : 'TBA';

        const cardHtml = `
        <div class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition duration-300 border border-gray-100 flex flex-col h-full">
            <div class="relative h-48">
                <img src="${proj.image_url || 'https://placehold.co/600x400?text=Project'}" class="w-full h-full object-cover">
                <div class="absolute top-4 right-4 ${badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full uppercase shadow-sm">
                    ${proj.status}
                </div>
                <div class="absolute bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent w-full p-4">
                    <span class="text-white text-xs font-bold bg-[#5A2C9D] px-2 py-0.5 rounded">${proj.location || 'General'}</span>
                </div>
            </div>
            <div class="p-6 flex-1 flex flex-col">
                <h3 class="text-xl font-bold text-gray-900 mb-2 line-clamp-2">${proj.title}</h3>
                <p class="text-gray-600 text-sm line-clamp-3 mb-4">${proj.description}</p>

                <div class="mt-auto pt-4 border-t border-gray-100">
                    <div class="flex justify-between items-center text-xs text-gray-500 mb-4">
                        <span><strong class="text-gray-800">Start:</strong> ${startYear}</span>
                        <span><strong class="text-gray-800">Fund:</strong> ${proj.funding_agency || 'N/A'}</span>
                    </div>
                    <!-- Modal Trigger Button -->
                    <button onclick="window.openDbModal(${index})" 
                        class="w-full py-2.5 rounded-lg border-2 border-[#5A2C9D] text-[#5A2C9D] font-bold text-sm hover:bg-[#5A2C9D] hover:text-white transition">
                        View Full Details
                    </button>
                </div>
            </div>
        </div>
        `;

        grid.insertAdjacentHTML('beforeend', cardHtml);
    });
});

// 3. Modal Logic
window.openDbModal = function(index) {
    const proj = window.dbProjects[index];
    if (!proj) return;

    // Helper for Dates (e.g., "Jan 2025")
    const formatDate = (dateStr) => {
        if (!dateStr) return 'TBA';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    // Fill Data
    setText('modal-title', proj.title);
    setText('modal-desc', proj.description);
    setText('modal-objectives', proj.objectives);
    setText('modal-timeline', `${formatDate(proj.start_date)} - ${formatDate(proj.end_date)}`);
    setText('modal-location', proj.location);
    setText('modal-funding', proj.funding_agency);
    setText('modal-beneficiaries', proj.beneficiaries);

    // Image
    const imgEl = document.getElementById('modal-image');
    if (imgEl) imgEl.src = proj.image_url || 'https://placehold.co/600x400?text=Project';

    // Status Badge
    const statusEl = document.getElementById('modal-status');
    if (statusEl) {
        statusEl.innerText = proj.status;
        statusEl.className = 'text-white text-xs font-bold px-2 py-1 rounded uppercase ' + 
            (proj.status === 'Ongoing' ? 'bg-green-500' : proj.status === 'Proposed' ? 'bg-yellow-500' : 'bg-blue-600');
    }

    // Proponents List
    const propContainer = document.getElementById('modal-proponents-list');
    if (propContainer) {
        propContainer.innerHTML = '';
        if (proj.proponents && Array.isArray(proj.proponents)) {
            proj.proponents.forEach(name => {
                propContainer.insertAdjacentHTML('beforeend', `
                    <div class="flex items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-[#5A2C9D] mr-3"><i class="bi bi-person"></i></div>
                        <span class="font-bold text-gray-900 text-sm">${name}</span>
                    </div>
                `);
            });
        } else {
            propContainer.innerHTML = '<span class="text-gray-500 italic text-sm">No proponents listed.</span>';
        }
    }

    // Open Modal
    const modalEl = document.getElementById('dynamicProjectModal');
    if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
};

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text || 'N/A';
}

// ===============================
// ADD ACTIVITY BUTTON TEST
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('act-save');

    if (!saveBtn) {
        console.warn('Add Activity button not found');
        return;
    }

    saveBtn.addEventListener('click', () => {
        console.log('Add Activity button clicked — Programs.js is active');
    });
});


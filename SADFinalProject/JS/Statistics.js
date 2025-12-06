// Statistics.js - SIMPLIFIED VERSION FOR IMMEDIATE DISPLAY
import { supabase } from './db_connection.js';
import { formatFileSize, getFileIcon } from './UploadFile.js';

// ============================================
// CORE STATISTICS FUNCTIONS
// ============================================

export async function loadStatistics() {
    console.log("📊 Loading statistics...");
    
    try {
        const [
            userStats,
            fileStats,
            recentActivity,
            storageStats
        ] = await Promise.all([
            getUserStatistics(),
            getFileStatistics(),
            getRecentActivity(),
            getStorageStatistics()
        ]);
        
        const statsData = {
            users: userStats,
            files: fileStats,
            activity: recentActivity,
            storage: storageStats
        };
        
        console.log("📊 Statistics loaded successfully", statsData);
        return { success: true, data: statsData };
        
    } catch (error) {
        console.error('Statistics error:', error);
        return { success: false, error: error.message };
    }
}

export async function getUserStatistics() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('status, role, created_at');
        
        if (error) throw error;
        
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.status === 'active').length;
        const pendingUsers = users.filter(u => u.status === 'pending').length;
        const inactiveUsers = users.filter(u => u.status === 'inactive').length;
        
        return {
            total: totalUsers,
            active: activeUsers,
            pending: pendingUsers,
            inactive: inactiveUsers,
            recent: 0
        };
        
    } catch (error) {
        console.error('User statistics error:', error);
        return {
            total: 0,
            active: 0,
            pending: 0,
            inactive: 0,
            recent: 0
        };
    }
}

export async function getFileStatistics() {
    try {
        const { data: files, error } = await supabase
            .from('uploaded_files')
            .select('*');
        
        if (error) throw error;
        
        const totalFiles = files.length;
        const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0);
        
        return {
            total: totalFiles,
            totalSize,
            recentUploads: 0
        };
        
    } catch (error) {
        console.error('File statistics error:', error);
        return {
            total: 0,
            totalSize: 0,
            recentUploads: 0
        };
    }
}

export async function getRecentActivity() {
    try {
        const { data: users } = await supabase
            .from('users')
            .select('user_id, full_name, email, role, created_at')
            .order('created_at', { ascending: false })
            .limit(5);
        
        const { data: files } = await supabase
            .from('uploaded_files')
            .select('id, original_name, uploaded_by, uploaded_at, file_size')
            .order('uploaded_at', { ascending: false })
            .limit(5);
        
        return {
            recentUsers: users || [],
            recentFiles: files || []
        };
        
    } catch (error) {
        console.error('Recent activity error:', error);
        return {
            recentUsers: [],
            recentFiles: []
        };
    }
}

export async function getStorageStatistics() {
    try {
        const { data: files } = await supabase
            .from('uploaded_files')
            .select('file_size');
        
        const totalUsed = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;
        const storageLimit = 100 * 1024 * 1024; // 100MB
        const usagePercentage = Math.min(100, (totalUsed / storageLimit) * 100);
        
        return {
            totalUsed,
            storageLimit,
            usagePercentage,
            topUsers: []
        };
        
    } catch (error) {
        console.error('Storage statistics error:', error);
        return {
            totalUsed: 0,
            storageLimit: 100 * 1024 * 1024,
            usagePercentage: 0,
            topUsers: []
        };
    }
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

export function updateStatisticsUI(stats) {
    console.log("Updating UI with stats:", stats);
    
    // Update stat cards
    updateElement('statTotalUsers', stats.users.total);
    updateElement('statActiveUsers', stats.users.active);
    updateElement('statPendingUsers', stats.users.pending);
    updateElement('statNewUsers', '0'); // Placeholder
    updateElement('statTotalFiles', stats.files.total);
    updateElement('statStorageUsed', formatFileSize(stats.files.totalSize));
    updateElement('statRecentUploads', '0'); // Placeholder
    
    // Update storage progress
    const storageProgress = document.getElementById('storageProgress');
    const storageUsed = document.getElementById('storageUsed');
    const storageTotal = document.getElementById('storageTotal');
    
    if (storageProgress && storageUsed && storageTotal) {
        const percentage = stats.storage.usagePercentage;
        storageProgress.style.width = `${percentage}%`;
        storageProgress.textContent = `${percentage.toFixed(1)}% Used`;
        storageUsed.textContent = formatFileSize(stats.storage.totalUsed);
        storageTotal.textContent = formatFileSize(stats.storage.storageLimit);
    }
    
    // Update recent activity tables
    updateRecentActivity(stats.activity);
    
    console.log("✅ UI updated successfully");
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateRecentActivity(activity) {
    // Update recent users table
    const recentUsersBody = document.getElementById('recentUsersBody');
    if (recentUsersBody) {
        if (activity.recentUsers.length === 0) {
            recentUsersBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">No recent users</td>
                </tr>
            `;
        } else {
            recentUsersBody.innerHTML = activity.recentUsers.map(user => `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-sm">
                                <span class="avatar-title bg-light rounded-circle">
                                    ${user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div class="ms-2">
                                <div class="fw-semibold">${user.full_name || 'Unknown'}</div>
                                <small class="text-muted">${user.email || 'No email'}</small>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge bg-secondary">${user.role || 'user'}</span></td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>${new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
            `).join('');
        }
    }
    
    // Update recent files table
    const recentFilesBody = document.getElementById('recentFilesBody');
    if (recentFilesBody) {
        if (activity.recentFiles.length === 0) {
            recentFilesBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">No recent files</td>
                </tr>
            `;
        } else {
            recentFilesBody.innerHTML = activity.recentFiles.map(file => `
                <tr>
                    <td>
                        <i class="bi ${getFileIcon(file.original_name)} me-2"></i>
                        <span class="text-truncate" style="max-width: 150px;" title="${file.original_name}">
                            ${file.original_name}
                        </span>
                    </td>
                    <td>${formatFileSize(file.file_size)}</td>
                    <td>${new Date(file.uploaded_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="window.downloadFileFromSupabase && window.downloadFileFromSupabase(${file.id}, '${file.original_name?.replace(/'/g, "\\'")}')">
                            <i class="bi bi-download"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }
}

// ============================================
// CHART FUNCTIONS (Optional - comment out if not using charts)
// ============================================

export function drawCharts(userStats, fileStats) {
    console.log("Attempting to draw charts...");
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.log("⚠️ Chart.js is not loaded. Add this to your HTML:");
        console.log('<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>');
        return;
    }
    
    try {
        // Draw user status chart if canvas exists
        const userChartCanvas = document.getElementById('userStatusChart');
        if (userChartCanvas) {
            drawUserStatusChart(userStats);
        }
        
        console.log("✅ Charts drawn successfully");
    } catch (error) {
        console.error("❌ Error drawing charts:", error);
    }
}

function drawUserStatusChart(userStats) {
    const ctx = document.getElementById('userStatusChart');
    if (!ctx) return;
    
    // Clear any existing chart
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    try {
        ctx.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Pending', 'Inactive'],
                datasets: [{
                    data: [userStats.active, userStats.pending, userStats.inactive],
                    backgroundColor: [
                        '#28a745', // Green
                        '#ffc107', // Yellow
                        '#dc3545'  // Red
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error creating chart:", error);
    }
}

// ============================================
// REFRESH FUNCTION
// ============================================

export async function refreshStatistics() {
    const result = await loadStatistics();
    if (result.success) {
        updateStatisticsUI(result.data);
        drawCharts(result.data.users, result.data.files);
        return { success: true, message: 'Statistics refreshed' };
    } else {
        return { success: false, message: result.error };
    }
}

// Make refresh function available globally
window.refreshStatistics = async function() {
    const result = await refreshStatistics();
    if (result.success) {
        // You might want to show a success message
        console.log("Statistics refreshed successfully");
    } else {
        console.error("Failed to refresh statistics:", result.message);
    }
};
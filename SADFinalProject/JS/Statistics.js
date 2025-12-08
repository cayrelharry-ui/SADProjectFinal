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
        // Change select('*') to select('file_size')
        const { data: files, error } = await supabase
            .from('uploaded_files')
            .select('file_size'); 
        
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
        // Get recent users
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('user_id, full_name, email, role, created_at')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (usersError) throw usersError;

        // Get recent files - FIXED query
        const { data: files, error: filesError } = await supabase
            .from('uploaded_files')
            .select('*, users!uploaded_by(full_name, email)')
            .order('uploaded_at', { ascending: false })
            .limit(5);
        
        if (filesError) {
            console.error("Files error:", filesError);
            throw filesError;
        }
        
        console.log("Recent files:", files);
        
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
        const { data: files, error } = await supabase
            .from('uploaded_files')
            .select('file_size');

        if (error) throw error; // ADDED: Check for error
        
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
            // ... (rest of the error return)
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
    
    // Update storage progress in Analytics section
    const storageProgress = document.getElementById('analyticsStorageProgress');
    const storageUsed = document.getElementById('analyticsStorageUsed');
    const storageTotal = document.getElementById('analyticsStorageTotal');
    
    if (storageProgress && storageUsed && storageTotal) {
        const percentage = stats.storage.usagePercentage;
        storageProgress.style.width = `${percentage}%`;
        storageProgress.textContent = `${percentage.toFixed(1)}% Used`;
        storageUsed.textContent = formatFileSize(stats.storage.totalUsed);
        storageTotal.textContent = formatFileSize(stats.storage.storageLimit);
    } else {
        console.warn("⚠️ Storage progress elements not found in Analytics");
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
    console.log("Updating recent activity:", activity);
    
    // Update recent users table in Analytics section
    const recentUsersBody = document.getElementById('recentUsersBody');
    if (recentUsersBody) {
        console.log("Found recentUsersBody element in Analytics");
        if (activity.recentUsers.length === 0) {
            recentUsersBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">No recent user activity</td>
                </tr>
            `;
        } else {
            recentUsersBody.innerHTML = activity.recentUsers.map(user => `
                <tr>
                    <td>
                        <i class="bi bi-person-circle me-2"></i>
                        <span title="${user.email || 'No email'}">${user.full_name || 'Unknown User'}</span>
                    </td>
                    <td><span class="badge bg-info">${user.role || 'user'}</span></td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>${new Date(user.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                </tr>
            `).join('');
        }
    } else {
        console.warn("⚠️ recentUsersBody element not found - Analytics section might be hidden");
    }
    
    // Update recent activity in Dashboard section
    const dashboardRecentActivity = document.getElementById('recentActivity');
    if (dashboardRecentActivity) {
        console.log("Found recentActivity element in Dashboard");
        if (activity.recentUsers.length === 0 && activity.recentFiles.length === 0) {
            dashboardRecentActivity.innerHTML = `
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">No recent activity</h6>
                    </div>
                    <p class="mb-1">No users or files have been added recently.</p>
                </div>
            `;
        } else {
            let activityHTML = '';
            
            // Add recent users
            activity.recentUsers.slice(0, 3).forEach(user => {
                activityHTML += `
                    <div class="list-group-item">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1"><i class="bi bi-person-plus text-primary me-2"></i>New User Registered</h6>
                            <small>${new Date(user.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                        </div>
                        <p class="mb-1">${user.full_name || 'New user'} (${user.email || 'No email'}) joined as ${user.role || 'user'}.</p>
                        <small class="text-muted">Registered on ${new Date(user.created_at).toLocaleDateString()}</small>
                    </div>
                `;
            });
            
            // Add recent files
            activity.recentFiles.slice(0, 3).forEach(file => {
                const fileName = file.original_name || 'Unknown file';
                const fileSize = formatFileSize(file.file_size || 0);
                const uploaderName = file.users?.full_name || 'Unknown user';
                
                activityHTML += `
                    <div class="list-group-item">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1"><i class="bi ${getFileIcon(fileName)} text-success me-2"></i>File Uploaded</h6>
                            <small>${new Date(file.uploaded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                        </div>
                        <p class="mb-1">${uploaderName} uploaded "${fileName}" (${fileSize}).</p>
                        <small class="text-muted">Uploaded on ${new Date(file.uploaded_at).toLocaleDateString()}</small>
                    </div>
                `;
            });
            
            dashboardRecentActivity.innerHTML = activityHTML;
        }
    } else {
        console.warn("⚠️ recentActivity element not found - Dashboard section might not be loaded");
    }
    
    // Update top users by storage (simplified for now)
    const topUsersBody = document.getElementById('topUsersBody');
    if (topUsersBody) {
        console.log("Found topUsersBody element in Analytics");
        topUsersBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted">
                    Storage analysis coming soon
                </td>
            </tr>
        `;
    }
    
    // Update file types table
    const fileTypesBody = document.getElementById('fileTypesBody');
    if (fileTypesBody) {
        console.log("Found fileTypesBody element in Analytics");
        // For now, show a placeholder
        fileTypesBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted">
                    File type analysis coming soon
                </td>
            </tr>
        `;
    }
    
    console.log("✅ Recent activity updated");
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
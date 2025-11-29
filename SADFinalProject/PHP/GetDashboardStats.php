<?php
session_start();
header('Content-Type: application/json');

// Database connection
$host = "localhost";
$db_user = "root";
$db_pass = "";
$db_name = "ccms_portal";

$conn = new mysqli($host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed.']);
    exit;
}

// Get user statistics
$stats = [];

// Total users
$result = $conn->query("SELECT COUNT(*) as count FROM users");
$stats['total_users'] = $result->fetch_assoc()['count'];

// Active users
$result = $conn->query("SELECT COUNT(*) as count FROM users WHERE status = 'active'");
$stats['active_users'] = $result->fetch_assoc()['count'];

// Pending users
$result = $conn->query("SELECT COUNT(*) as count FROM users WHERE status = 'inactive'");
$stats['pending_users'] = $result->fetch_assoc()['count'];

// Inactive users (same as pending for now)
$stats['inactive_users'] = $stats['pending_users'];

// Get recent activity (you can expand this with an activity log table)
$recentActivity = [];

echo json_encode([
    'status' => 'success', 
    'stats' => $stats,
    'recentActivity' => $recentActivity
]);

$conn->close();
?>
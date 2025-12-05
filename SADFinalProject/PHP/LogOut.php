<?php
// LogOut.php - Handle user logout for all roles
session_start();

// Clear all session data
session_unset();
session_destroy();

// Clear session cookie
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time()-3600, '/');
}

// If this is an AJAX request, return JSON
if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
    exit();
}

// Otherwise redirect to login page
header("Location: ../HTML/LogIn.html");
exit();
?>

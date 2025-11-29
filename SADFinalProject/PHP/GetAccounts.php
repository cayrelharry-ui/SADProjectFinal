<?php
session_start();
header('Content-Type: application/json');

// Check if user is admin (you should add proper authentication)
// if (!isset($_SESSION['logged_in']) || $_SESSION['role'] !== 'admin') {
//     echo json_encode(['status' => 'error', 'message' => 'Unauthorized access.']);
//     exit;
// }

$status = $_GET['status'] ?? 'active';

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

if ($status === 'rejected') {
    // For rejected, we'll delete the account
    $stmt = $conn->prepare("SELECT user_id, full_name, email, role, created_at FROM users WHERE status = 'inactive'");
} else {
    $stmt = $conn->prepare("SELECT user_id, full_name, email, role, created_at FROM users WHERE status = ?");
    $stmt->bind_param("s", $status);
}

$stmt->execute();
$result = $stmt->get_result();

$accounts = [];
while ($row = $result->fetch_assoc()) {
    $accounts[] = $row;
}

echo json_encode(['status' => 'success', 'accounts' => $accounts]);

$stmt->close();
$conn->close();
?>
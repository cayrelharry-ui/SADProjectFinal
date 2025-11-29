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

// Get all users
$stmt = $conn->prepare("SELECT user_id, full_name, email, role, status, created_at FROM users ORDER BY created_at DESC");
$stmt->execute();
$result = $stmt->get_result();

$users = [];
while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}

echo json_encode(['status' => 'success', 'users' => $users]);

$stmt->close();
$conn->close();
?>
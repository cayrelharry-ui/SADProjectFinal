<?php
// GetFileInfo.php - Get detailed file information
session_start();
header('Content-Type: application/json');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Database configuration
$host = "localhost";
$username = "root";
$password = "";
$database = "ccms_portal";

// Create database connection
$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit;
}

// Get file ID from request
$fileId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($fileId <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid file ID']);
    exit;
}

// Query for file information
$query = "SELECT 
            uf.*,
            u.full_name as uploaded_by_name
          FROM uploaded_files uf
          LEFT JOIN users u ON uf.uploaded_by = u.user_id
          WHERE uf.id = ?";
          
$stmt = $conn->prepare($query);
$stmt->bind_param('i', $fileId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['status' => 'error', 'message' => 'File not found']);
    $stmt->close();
    $conn->close();
    exit;
}

$file = $result->fetch_assoc();
$stmt->close();
$conn->close();

echo json_encode([
    'status' => 'success',
    'file' => $file
]);
?>
<?php
// DeleteFile.php
session_start();
header('Content-Type: application/json');

// Check if admin is logged in
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    // For testing, bypass this check
    // echo json_encode(['status' => 'error', 'message' => 'Admin access required']);
    // exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);
$fileId = isset($input['file_id']) ? intval($input['file_id']) : 0;

if ($fileId <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid file ID']);
    exit;
}

// Database configuration
$host = "localhost";
$username = "root";
$password = "";
$database = "ccms_portal";

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// Get file information first
$stmt = $conn->prepare("SELECT stored_name FROM uploaded_files WHERE id = ?");
$stmt->bind_param("i", $fileId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['status' => 'error', 'message' => 'File not found']);
    $conn->close();
    exit;
}

$file = $result->fetch_assoc();
$storedName = $file['stored_name'];

// Delete from database
$deleteStmt = $conn->prepare("DELETE FROM uploaded_files WHERE id = ?");
$deleteStmt->bind_param("i", $fileId);

if ($deleteStmt->execute()) {
    // Try to delete the actual file
    $filePath = dirname(__DIR__) . '/uploads/' . $storedName;
    if (file_exists($filePath)) {
        unlink($filePath);
    }
    
    echo json_encode(['status' => 'success', 'message' => 'File deleted successfully']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to delete file from database']);
}

$conn->close();
?>
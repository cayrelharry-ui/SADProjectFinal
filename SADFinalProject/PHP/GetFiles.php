<?php
// GetFiles.php - Get uploaded files from database
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

// Get filter parameters
$category = isset($_GET['category']) ? $conn->real_escape_string($_GET['category']) : '';
$search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';

// Build query
$query = "SELECT * FROM uploaded_files WHERE 1=1";

if (!empty($category)) {
    $query .= " AND category = '$category'";
}

if (!empty($search)) {
    $query .= " AND (original_name LIKE '%$search%' OR description LIKE '%$search%')";
}

$query .= " ORDER BY uploaded_at DESC";

$result = $conn->query($query);

if (!$result) {
    echo json_encode(['status' => 'error', 'message' => 'Query failed: ' . $conn->error]);
    $conn->close();
    exit;
}

$files = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $files[] = $row;
    }
}

// Get storage statistics
$statsQuery = $conn->query("SELECT COUNT(*) as file_count, SUM(file_size) as total_size FROM uploaded_files");
$stats = $statsQuery->fetch_assoc();

$conn->close();

echo json_encode([
    'status' => 'success',
    'files' => $files,
    'stats' => [
        'file_count' => $stats['file_count'] ?? 0,
        'total_size' => $stats['total_size'] ?? 0,
        'storage_limit' => 100 * 1024 * 1024 // 100MB limit
    ]
]);
?>
<?php
// DownloadFile.php
session_start();

// Database configuration
$host = "localhost";
$username = "root";
$password = "";
$database = "ccms_portal";

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    die("Database connection failed");
}

// Get file ID
$fileId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($fileId <= 0) {
    die("Invalid file ID");
}

// Get file information
$stmt = $conn->prepare("SELECT original_name, stored_name FROM uploaded_files WHERE id = ?");
$stmt->bind_param("i", $fileId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    die("File not found");
}

$file = $result->fetch_assoc();
$conn->close();

// File path
$uploadDir = dirname(__DIR__) . '/uploads/';
$filePath = $uploadDir . $file['stored_name'];

if (!file_exists($filePath)) {
    die("File not found on server");
}

// Set headers for download
header('Content-Description: File Transfer');
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . basename($file['original_name']) . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
header('Content-Length: ' . filesize($filePath));

// Clear output buffer
flush();

// Read file and output to browser
readfile($filePath);
exit;
?>
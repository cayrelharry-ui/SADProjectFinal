<?php
// DownloadAttachment.php - Download partnership request attachments
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

// Get attachment ID
$attachmentId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($attachmentId <= 0) {
    die("Invalid attachment ID");
}

// Get attachment information
$stmt = $conn->prepare("SELECT original_name, stored_name FROM partnership_attachments WHERE attachment_id = ?");
$stmt->bind_param("i", $attachmentId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    die("Attachment not found");
}

$attachment = $result->fetch_assoc();
$conn->close();

// File path - adjust based on your upload directory structure
$uploadDir = dirname(__DIR__) . '/uploads/partnership_attachments/';
$filePath = $uploadDir . $attachment['stored_name'];

if (!file_exists($filePath)) {
    die("File not found on server");
}

// Set headers for download
header('Content-Description: File Transfer');
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . basename($attachment['original_name']) . '"');
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


<?php
session_start();
header('Content-Type: application/json');

// Database connection
$host = "localhost";
$user = "root";
$pass = "";
$dbname = "ccms_portal";

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// Get form data
$category = $_POST['category'] ?? 'other';
$description = $_POST['description'] ?? '';
$access_level = $_POST['access_level'] ?? 'private';
$uploaded_by = 1; // For testing

// Create uploads directory
$uploadDir = dirname(__DIR__) . '/uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$successCount = 0;
$failedCount = 0;

if (isset($_FILES['files'])) {
    foreach ($_FILES['files']['tmp_name'] as $key => $tmp_name) {
        if ($_FILES['files']['error'][$key] === UPLOAD_ERR_OK) {
            $original_name = $_FILES['files']['name'][$key];
            $file_size = $_FILES['files']['size'][$key];
            $file_ext = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
            
            // Generate unique filename
            $stored_name = uniqid() . '_' . time() . '.' . $file_ext;
            $destination = $uploadDir . $stored_name;
            
            if (move_uploaded_file($tmp_name, $destination)) {
                $stmt = $conn->prepare("INSERT INTO uploaded_files (original_name, stored_name, file_type, file_size, category, description, access_level, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("sssisssi", $original_name, $stored_name, $file_ext, $file_size, $category, $description, $access_level, $uploaded_by);
                
                if ($stmt->execute()) {
                    $successCount++;
                } else {
                    $failedCount++;
                }
                $stmt->close();
            } else {
                $failedCount++;
            }
        } else {
            $failedCount++;
        }
    }
}

$conn->close();

if ($successCount > 0) {
    echo json_encode([
        'status' => 'success',
        'message' => "Successfully uploaded $successCount file(s)"
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to upload files'
    ]);
}
?>
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

// Get form data - REMOVE category from POST data
$description = $_POST['description'] ?? '';
$access_level = $_POST['access_level'] ?? 'private';
$uploaded_by = 1; // For testing

// Create uploads directory
$uploadDir = dirname(__DIR__) . '/uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Function to auto-detect file category
function detectFileCategory($filename, $fileType = null) {
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    
    // Image files
    $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif', 'psd', 'ai', 'eps'];
    if (in_array($extension, $imageExtensions)) {
        return 'images';
    }
    
    // Document files
    $documentExtensions = [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 
        'odt', 'ods', 'odp', 'pages', 'numbers', 'key', 'md', 'html', 'htm', 'xml',
        'json', 'yaml', 'yml', 'ini', 'conf', 'log'
    ];
    if (in_array($extension, $documentExtensions)) {
        return 'documents';
    }
    
    // Video files
    $videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv', 'webm', 'mpeg', 'mpg', '3gp', 'm4v', 'ogg', 'ogv', 'ts'];
    if (in_array($extension, $videoExtensions)) {
        return 'videos';
    }
    
    // Audio files
    $audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'aiff', 'mid', 'midi', 'opus'];
    if (in_array($extension, $audioExtensions)) {
        return 'audio';
    }
    
    // Archive files
    $archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'z', 'lz', 'lzma', 'lzo'];
    if (in_array($extension, $archiveExtensions)) {
        return 'archives';
    }
    
    // Code files
    $codeExtensions = ['php', 'js', 'css', 'html', 'htm', 'xml', 'json', 'py', 'java', 'c', 'cpp', 'cs', 'rb', 'go', 'rs', 'swift'];
    if (in_array($extension, $codeExtensions)) {
        return 'documents'; // Treat code files as documents
    }
    
    // Default to 'other'
    return 'other';
}

$successCount = 0;
$failedCount = 0;
$uploadedFiles = [];

if (isset($_FILES['files'])) {
    foreach ($_FILES['files']['tmp_name'] as $key => $tmp_name) {
        if ($_FILES['files']['error'][$key] === UPLOAD_ERR_OK) {
            $original_name = $_FILES['files']['name'][$key];
            $file_size = $_FILES['files']['size'][$key];
            $file_ext = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
            
            // Auto-detect category
            $category = detectFileCategory($original_name, $file_ext);
            
            // Generate unique filename
            $stored_name = uniqid() . '_' . time() . '.' . $file_ext;
            $destination = $uploadDir . $stored_name;
            
            // Check file size (optional: 10MB limit)
            $maxFileSize = 10 * 1024 * 1024; // 10MB
            if ($file_size > $maxFileSize) {
                $failedCount++;
                continue;
            }
            
            if (move_uploaded_file($tmp_name, $destination)) {
                $stmt = $conn->prepare("INSERT INTO uploaded_files (original_name, stored_name, file_type, file_size, category, description, access_level, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("sssisssi", $original_name, $stored_name, $file_ext, $file_size, $category, $description, $access_level, $uploaded_by);
                
                if ($stmt->execute()) {
                    $successCount++;
                    $uploadedFiles[] = [
                        'name' => $original_name,
                        'category' => $category,
                        'size' => $file_size
                    ];
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
        'message' => "Successfully uploaded $successCount file(s)",
        'files' => $uploadedFiles
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to upload files. Please check file size and try again.'
    ]);
}
?>
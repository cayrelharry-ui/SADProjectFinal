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
$letterDate = $_POST['letterDate'] ?? '';
$subject = $_POST['subject'] ?? '';
$orgName = $_POST['orgName'] ?? '';
$orgType = $_POST['orgType'] ?? '';
$address = $_POST['address'] ?? '';
$collaboration = $_POST['collaboration'] ?? '';
$outcomes = $_POST['outcomes'] ?? '';
$additionalInfo = $_POST['additionalInfo'] ?? '';
$contactPerson = $_POST['contactPerson'] ?? '';
$position = $_POST['position'] ?? '';
$email = $_POST['email'] ?? '';
$phone = $_POST['phone'] ?? '';

// Validate required fields
$requiredFields = ['letterDate', 'subject', 'orgName', 'orgType', 'address', 'collaboration', 'contactPerson', 'email', 'phone'];
$missingFields = [];

foreach ($requiredFields as $field) {
    if (empty($_POST[$field])) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Please fill in all required fields: ' . implode(', ', $missingFields)
    ]);
    $conn->close();
    exit;
}

// Create uploads directory for partnership requests
$uploadDir = dirname(__DIR__) . '/uploads/partnership_requests/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Create partnership_requests table if it doesn't exist
$createTableQuery = "CREATE TABLE IF NOT EXISTS partnership_requests (
    request_id INT(11) AUTO_INCREMENT PRIMARY KEY,
    letter_date DATE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    org_name VARCHAR(255) NOT NULL,
    org_type VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    collaboration TEXT NOT NULL,
    outcomes TEXT,
    additional_info TEXT,
    contact_person VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    status ENUM('pending', 'reviewed', 'approved', 'rejected') DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";

$conn->query($createTableQuery);

// Create partnership_attachments table if it doesn't exist
$createAttachmentsTableQuery = "CREATE TABLE IF NOT EXISTS partnership_attachments (
    attachment_id INT(11) AUTO_INCREMENT PRIMARY KEY,
    request_id INT(11) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INT(11) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES partnership_requests(request_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";

$conn->query($createAttachmentsTableQuery);

// Insert partnership request into database
$stmt = $conn->prepare("INSERT INTO partnership_requests (letter_date, subject, org_name, org_type, address, collaboration, outcomes, additional_info, contact_person, position, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("ssssssssssss", $letterDate, $subject, $orgName, $orgType, $address, $collaboration, $outcomes, $additionalInfo, $contactPerson, $position, $email, $phone);

if (!$stmt->execute()) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to save partnership request: ' . $conn->error
    ]);
    $stmt->close();
    $conn->close();
    exit;
}

$requestId = $conn->insert_id;
$stmt->close();

// Handle file uploads
$uploadedFiles = [];
$failedFiles = [];

if (isset($_FILES['attachments']) && !empty($_FILES['attachments']['name'][0])) {
    $files = $_FILES['attachments'];
    $fileCount = count($files['name']);
    
    for ($i = 0; $i < $fileCount; $i++) {
        if ($files['error'][$i] === UPLOAD_ERR_OK) {
            $originalName = $files['name'][$i];
            $fileSize = $files['size'][$i];
            $tmpName = $files['tmp_name'][$i];
            $fileExt = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            
            // Validate file type
            $allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
            if (!in_array($fileExt, $allowedTypes)) {
                $failedFiles[] = $originalName . ' (Invalid file type)';
                continue;
            }
            
            // Validate file size (10MB)
            $maxSize = 10 * 1024 * 1024; // 10MB
            if ($fileSize > $maxSize) {
                $failedFiles[] = $originalName . ' (File too large)';
                continue;
            }
            
            // Generate unique filename
            $storedName = uniqid() . '_' . time() . '_' . $i . '.' . $fileExt;
            $destination = $uploadDir . $storedName;
            
            if (move_uploaded_file($tmpName, $destination)) {
                // Insert file record into database
                $fileStmt = $conn->prepare("INSERT INTO partnership_attachments (request_id, original_name, stored_name, file_type, file_size) VALUES (?, ?, ?, ?, ?)");
                $fileStmt->bind_param("isssi", $requestId, $originalName, $storedName, $fileExt, $fileSize);
                
                if ($fileStmt->execute()) {
                    $uploadedFiles[] = $originalName;
                } else {
                    $failedFiles[] = $originalName . ' (Database error)';
                    // Remove uploaded file if database insert fails
                    @unlink($destination);
                }
                $fileStmt->close();
            } else {
                $failedFiles[] = $originalName . ' (Upload failed)';
            }
        } else {
            $failedFiles[] = $files['name'][$i] . ' (Upload error: ' . $files['error'][$i] . ')';
        }
    }
}

$conn->close();

// Prepare response
$message = "Partnership request submitted successfully!";
if (count($uploadedFiles) > 0) {
    $message .= " " . count($uploadedFiles) . " file(s) uploaded.";
}
if (count($failedFiles) > 0) {
    $message .= " " . count($failedFiles) . " file(s) failed to upload.";
}

echo json_encode([
    'status' => 'success',
    'message' => $message,
    'request_id' => $requestId,
    'uploaded_files' => $uploadedFiles,
    'failed_files' => $failedFiles
]);
?>


<?php
session_start();
header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit;
}

// Database connection
$host = 'localhost';
$dbname = 'ccms_portal';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$response = ['success' => false, 'message' => ''];

try {
    // Validate required fields
    $requiredFields = [
        'moa_title', 'moa_ref_number', 'start_date', 'end_date',
        'covered_programs', 'org_name', 'rep_name', 'rep_position',
        'rep_email', 'rep_phone', 'org_address'
    ];

    $errors = [];
    foreach ($requiredFields as $field) {
        if (!isset($_POST[$field]) || empty(trim($_POST[$field]))) {
            $errors[] = "Required field '$field' is missing";
        }
    }

    if (!empty($errors)) {
        throw new Exception(implode(', ', $errors));
    }

    // Sanitize input data
    $coordinator_id = $_SESSION['user_id'];
    $moa_title = htmlspecialchars($_POST['moa_title']);
    $moa_ref_number = htmlspecialchars($_POST['moa_ref_number']);
    $start_date = htmlspecialchars($_POST['start_date']);
    $end_date = htmlspecialchars($_POST['end_date']);
    $covered_programs = htmlspecialchars($_POST['covered_programs']);
    $org_name = htmlspecialchars($_POST['org_name']);
    $rep_name = htmlspecialchars($_POST['rep_name']);
    $rep_position = htmlspecialchars($_POST['rep_position']);
    $rep_email = htmlspecialchars($_POST['rep_email']);
    $rep_phone = htmlspecialchars($_POST['rep_phone']);
    $org_address = htmlspecialchars($_POST['org_address']);

    // Validate dates
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start_date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end_date)) {
        throw new Exception('Invalid date format. Use YYYY-MM-DD');
    }

    if ($start_date >= $end_date) {
        throw new Exception('End date must be after start date');
    }

    // Validate email
    if (!filter_var($rep_email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }

    // Check if reference number already exists
    $stmt = $pdo->prepare("SELECT moa_id FROM moa_submissions WHERE moa_ref_number = ?");
    $stmt->execute([$moa_ref_number]);
    if ($stmt->rowCount() > 0) {
        throw new Exception('MOA reference number already exists');
    }

    // Handle file upload
    $uploadDir = '../uploads/moa_documents/';

    // Create directory if it doesn't exist
    if (!file_exists($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            throw new Exception('Failed to create upload directory');
        }
    }

    // Validate main MOA document
    if (!isset($_FILES['moa_document']) || $_FILES['moa_document']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('MOA document is required');
    }

    $moaFile = $_FILES['moa_document'];
    $maxSize = 10 * 1024 * 1024; // 10MB

    // Check file size
    if ($moaFile['size'] > $maxSize) {
        throw new Exception('MOA document must be less than 10MB');
    }

    // Check file type
    $fileExtension = strtolower(pathinfo($moaFile['name'], PATHINFO_EXTENSION));
    $allowedExtensions = ['pdf', 'doc', 'docx'];

    if (!in_array($fileExtension, $allowedExtensions)) {
        throw new Exception('Only PDF, DOC, and DOCX files are allowed');
    }

    // Generate unique filename
    $originalName = pathinfo($moaFile['name'], PATHINFO_FILENAME);
    $safeName = preg_replace('/[^A-Za-z0-9_-]/', '_', $originalName);
    $uniqueId = uniqid();
    $moaFileName = $safeName . '_' . $uniqueId . '.' . $fileExtension;
    $moaFilePath = $uploadDir . $moaFileName;

    // Move uploaded file
    if (!move_uploaded_file($moaFile['tmp_name'], $moaFilePath)) {
        throw new Exception('Failed to upload MOA document');
    }

    // Store relative path
    $relativePath = 'uploads/moa_documents/' . $moaFileName;

    // Insert into database
    $stmt = $pdo->prepare("
        INSERT INTO moa_submissions (
            coordinator_id, moa_title, moa_ref_number, start_date, end_date,
            covered_programs, org_name, rep_name, rep_position, rep_email,
            rep_phone, org_address, moa_document_path, status, submission_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    ");

    $stmt->execute([
        $coordinator_id, $moa_title, $moa_ref_number, $start_date, $end_date,
        $covered_programs, $org_name, $rep_name, $rep_position, $rep_email,
        $rep_phone, $org_address, $relativePath
    ]);

    $moaId = $pdo->lastInsertId();

    // Handle supporting documents
    $supportingDocs = [];
    if (isset($_FILES['supporting_documents']) && is_array($_FILES['supporting_documents']['name'])) {
        $supportingDir = $uploadDir . 'supporting/';
        if (!file_exists($supportingDir)) {
            mkdir($supportingDir, 0777, true);
        }

        for ($i = 0; $i < count($_FILES['supporting_documents']['name']); $i++) {
            if ($_FILES['supporting_documents']['error'][$i] === UPLOAD_ERR_OK) {
                $supportFile = [
                    'name' => $_FILES['supporting_documents']['name'][$i],
                    'tmp_name' => $_FILES['supporting_documents']['tmp_name'][$i],
                    'size' => $_FILES['supporting_documents']['size'][$i],
                    'type' => $_FILES['supporting_documents']['type'][$i]
                ];

                if ($supportFile['size'] > 5 * 1024 * 1024) {
                    continue;
                }

                $supportExtension = strtolower(pathinfo($supportFile['name'], PATHINFO_EXTENSION));
                $supportAllowed = array_merge($allowedExtensions, ['jpg', 'jpeg', 'png', 'xls', 'xlsx']);

                if (in_array($supportExtension, $supportAllowed)) {
                    $supportOriginalName = pathinfo($supportFile['name'], PATHINFO_FILENAME);
                    $supportSafeName = preg_replace('/[^A-Za-z0-9_-]/', '_', $supportOriginalName);
                    $supportUniqueId = uniqid();
                    $supportFileName = $supportSafeName . '_' . $supportUniqueId . '.' . $supportExtension;
                    $supportFilePath = $supportDir . $supportFileName;

                    if (move_uploaded_file($supportFile['tmp_name'], $supportFilePath)) {
                        $supportingDocs[] = [
                            'original_name' => $supportFile['name'],
                            'stored_name' => $supportFileName,
                            'path' => 'uploads/moa_documents/supporting/' . $supportFileName
                        ];
                    }
                }
            }
        }

        // Update database with supporting documents
        if (!empty($supportingDocs)) {
            $supportingDocsJson = json_encode($supportingDocs);
            $updateStmt = $pdo->prepare("UPDATE moa_submissions SET supporting_docs = ? WHERE moa_id = ?");
            $updateStmt->execute([$supportingDocsJson, $moaId]);
        }
    }

    $response['success'] = true;
    $response['message'] = 'MOA submitted successfully for review';
    $response['moa_id'] = $moaId;
    $response['file_path'] = $relativePath;

} catch (Exception $e) {
    // Clean up uploaded file if there was an error
    if (isset($moaFilePath) && file_exists($moaFilePath)) {
        unlink($moaFilePath);
    }
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
exit;


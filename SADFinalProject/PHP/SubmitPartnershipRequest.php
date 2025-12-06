<?php
// SubmitPartnershipRequest.php - Submits request and uploads attachments to Supabase
session_start();
header('Content-Type: application/json');

// --- INCLUDE SUPABASE UTILITY & STORAGE FUNCTION ---
require_once('db_connection.php'); 
// ----------------------------------------------------

const REQUESTS_TABLE = "partnership_requests";
const ATTACHMENTS_TABLE = "partnership_attachments";
const STORAGE_BUCKET = "uploads"; // Assuming you use the public 'uploads' bucket

// Define the file upload function (re-used from Uploads.php conversion)
function uploadFileToSupabase($bucketName, $filePath, $fileName, $mimeType) {
    $storageUrl = SUPABASE_URL . "/storage/v1/object/{$bucketName}/{$fileName}";
    
    $fileContent = file_get_contents($filePath);
    if ($fileContent === false) {
        return ['status' => 'error', 'message' => 'Could not read local file.'];
    }

    $ch = curl_init($storageUrl);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $fileContent);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $headers = [
        "apikey: " . SERVICE_ROLE_KEY,
        "Authorization: Bearer " . SERVICE_ROLE_KEY,
        "Content-Type: {$mimeType}", 
        "X-Upsert: true"
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code === 200 || $http_code === 201) {
        $publicUrl = SUPABASE_URL . "/storage/v1/object/public/{$bucketName}/{$fileName}";
        return ['status' => 'success', 'url' => $publicUrl];
    } else {
        return ['status' => 'error', 'message' => 'Storage upload failed.', 'http_code' => $http_code];
    }
}


// --- 1. Get Form Data ---
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

// --- 2. Validation (Remains the same) ---
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
    exit;
}

// --- 3. Supabase: Insert Partnership Request (Replaces MySQL INSERT) ---

// NOTE: We assume 'partnership_requests' and 'partnership_attachments' tables 
// and their schema have been created manually in Supabase.
// The local file system directory creation and CREATE TABLE queries are removed.

$requestPayload = [
    'letter_date' => $letterDate,
    'subject' => $subject,
    'org_name' => $orgName,
    'org_type' => $orgType,
    'address' => $address,
    'collaboration' => $collaboration,
    'outcomes' => $outcomes,
    'additional_info' => $additionalInfo,
    'contact_person' => $contactPerson,
    'position' => $position,
    'email' => $email,
    'phone' => $phone,
    'status' => 'pending' // Default status
];

// Use SERVICE_ROLE_KEY to ensure insertion success
$response_request = supabase_request(REQUESTS_TABLE, 'POST', $requestPayload, SERVICE_ROLE_KEY, 'return=representation');

if ($response_request === false || $response_request['status'] !== 201) {
    $error_msg = $response_request['data']['message'] ?? 'Unknown error during request insertion.';
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to save partnership request: ' . $error_msg
    ]);
    exit;
}

// Get the request_id from the response payload (crucial for attachments)
$requestId = $response_request['data'][0]['request_id']; 

// --- 4. Handle File Uploads to Supabase Storage ---
$uploadedFiles = [];
$failedFiles = [];
$attachmentInserts = [];
$maxSize = 10 * 1024 * 1024; // 10MB
$allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];

if (isset($_FILES['attachments']) && !empty($_FILES['attachments']['name'][0])) {
    $files = $_FILES['attachments'];
    $fileCount = count($files['name']);
    
    for ($i = 0; $i < $fileCount; $i++) {
        if ($files['error'][$i] === UPLOAD_ERR_OK) {
            $originalName = $files['name'][$i];
            $fileSize = $files['size'][$i];
            $tmpName = $files['tmp_name'][$i];
            $fileExt = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            $fileMime = mime_content_type($tmpName);

            // Validation checks
            if (!in_array($fileExt, $allowedTypes)) {
                $failedFiles[] = $originalName . ' (Invalid file type)';
                continue;
            }
            if ($fileSize > $maxSize) {
                $failedFiles[] = $originalName . ' (File too large)';
                continue;
            }
            
            // Generate unique filename and upload to Supabase Storage
            $storedName = 'request_' . $requestId . '/' . uniqid() . '_' . $i . '.' . $fileExt;
            
            $uploadResult = uploadFileToSupabase(STORAGE_BUCKET, $tmpName, $storedName, $fileMime);
            
            if ($uploadResult['status'] === 'success') {
                $uploadedFiles[] = $originalName;
                
                // Prepare metadata insertion for the batch request
                $attachmentInserts[] = [
                    'request_id' => $requestId,
                    'original_name' => $originalName,
                    'stored_name' => $storedName, // This is the path in storage
                    'file_type' => $fileExt,
                    'file_size' => $fileSize
                    // 'public_url' => $uploadResult['url'] // Optional: store the public URL
                ];
            } else {
                $failedFiles[] = $originalName . ' (Storage error: ' . ($uploadResult['message'] ?? 'Unknown') . ')';
            }
        } else {
            $failedFiles[] = $files['name'][$i] . ' (Upload error: ' . $files['error'][$i] . ')';
        }
    }
}

// --- 5. Supabase: Batch Insert Attachment Metadata (Replaces nested fileStmt inserts) ---

if (!empty($attachmentInserts)) {
    // Send all attachment records in one batch request
    $response_attachments = supabase_request(ATTACHMENTS_TABLE, 'POST', $attachmentInserts, SERVICE_ROLE_KEY);

    if ($response_attachments === false || $response_attachments['status'] !== 201) {
        $failedFiles[] = "Metadata insertion failed for one or more files.";
        // NOTE: In a production app, you would add logic here to DELETE the files 
        // from Supabase Storage that failed to have their metadata inserted.
    }
}

// --- 6. Prepare Final Response ---
$message = "Partnership request submitted successfully!";
if (count($uploadedFiles) > 0) {
    $message .= " " . count($uploadedFiles) . " file(s) uploaded.";
}
if (count($failedFiles) > 0) {
    $message .= " NOTE: " . count($failedFiles) . " file(s) failed to upload/record.";
}

echo json_encode([
    'status' => 'success',
    'message' => $message,
    'request_id' => $requestId,
    'uploaded_files' => $uploadedFiles,
    'failed_files' => $failedFiles
]);
?>
<?php
// Suppress any output before JSON (whitespace, warnings, etc.)
ob_start();

session_start();

// Set JSON header
header('Content-Type: application/json; charset=utf-8');

// Suppress error display but log them
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Database connection
$host = "localhost";
$user = "root";
$pass = "";
$dbname = "ccms_portal";

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    ob_end_clean(); // Clear any output
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit;
}

// Get action parameter
$action = $_GET['action'] ?? '';

// Get email parameter (required for most actions)
$email = $_GET['email'] ?? '';

// Route to appropriate handler
$output_sent = false;
try {
    switch ($action) {
        case 'stats':
            getPartnerStats($conn, $email);
            $output_sent = true;
            break;
        case 'requests':
            getPartnerRequests($conn, $email);
            $output_sent = true;
            break;
        case 'details':
            getRequestDetails($conn);
            $output_sent = true;
            break;
        case 'profile':
            getPartnerProfile($conn, $email);
            $output_sent = true;
            break;
        case 'projects':
            getPartnerProjects($conn, $email);
            $output_sent = true;
            break;
        case 'documents':
            getPartnerDocuments($conn, $email);
            $output_sent = true;
            break;
        default:
            ob_clean(); // Clear any output
            echo json_encode(['status' => 'error', 'message' => 'Invalid action parameter']);
            $output_sent = true;
            break;
    }
} catch (Exception $e) {
    ob_clean(); // Clear any output
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
    $output_sent = true;
}

$conn->close();

// Only flush if output wasn't already sent
if (!$output_sent && ob_get_level() > 0) {
    ob_end_flush();
}

// ============================================
// FUNCTION: Get Partner Statistics
// ============================================
function getPartnerStats($conn, $email) {
    if (empty($email)) {
        ob_clean(); // Clear any output
        echo json_encode(['status' => 'error', 'message' => 'Email parameter is required']);
        return;
    }

    $stats = [];

    // Total requests
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM partnership_requests WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $stats['total_requests'] = $result->fetch_assoc()['count'];
    $stmt->close();

    // Approved requests
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM partnership_requests WHERE email = ? AND status = 'approved'");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $stats['approved_requests'] = $result->fetch_assoc()['count'];
    $stmt->close();

    // Pending requests
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM partnership_requests WHERE email = ? AND status = 'pending'");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $stats['pending_requests'] = $result->fetch_assoc()['count'];
    $stmt->close();

    // Active projects
    $stats['active_projects'] = 0;

    // Get most recent organization info
    $stmt = $conn->prepare("SELECT org_name, org_type, email, status, updated_at, submitted_at 
                            FROM partnership_requests 
                            WHERE email = ? 
                            ORDER BY submitted_at DESC 
                            LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $organization = $result->fetch_assoc();
    $stmt->close();

    ob_clean(); // Clear any output before JSON
    echo json_encode([
        'status' => 'success',
        'stats' => $stats,
        'organization' => $organization
    ]);
}

// ============================================
// FUNCTION: Get Partner Requests
// ============================================
function getPartnerRequests($conn, $email) {
    if (empty($email)) {
        ob_clean(); // Clear any output
        echo json_encode(['status' => 'error', 'message' => 'Email parameter is required']);
        return;
    }

    $status = $_GET['status'] ?? '';
    $search = $_GET['search'] ?? '';
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 0;

    // Build query
    $query = "SELECT request_id, letter_date, subject, org_name, org_type, address, 
                     collaboration, outcomes, additional_info, contact_person, position, 
                     email, phone, status, submitted_at, updated_at 
              FROM partnership_requests 
              WHERE email = ?";

    $params = [$email];
    $types = "s";

    // Add status filter
    if (!empty($status)) {
        $query .= " AND status = ?";
        $params[] = $status;
        $types .= "s";
    }

    // Add search filter
    if (!empty($search)) {
        $query .= " AND (subject LIKE ? OR org_name LIKE ? OR collaboration LIKE ?)";
        $searchParam = "%{$search}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types .= "sss";
    }

    // Order by most recent first
    $query .= " ORDER BY submitted_at DESC";

    // Add limit if specified
    if ($limit > 0) {
        $query .= " LIMIT ?";
        $params[] = $limit;
        $types .= "i";
    }

    // Prepare and execute
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        ob_clean(); // Clear any output
        echo json_encode(['status' => 'error', 'message' => 'Query preparation failed: ' . $conn->error]);
        return;
    }

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $requests = [];
    while ($row = $result->fetch_assoc()) {
        $requests[] = $row;
    }

    ob_clean(); // Clear any output before JSON
    echo json_encode([
        'status' => 'success',
        'requests' => $requests
    ]);

    $stmt->close();
}

// ============================================
// FUNCTION: Get Request Details
// ============================================
function getRequestDetails($conn) {
    $requestId = $_GET['id'] ?? 0;

    if (empty($requestId)) {
        echo json_encode(['status' => 'error', 'message' => 'Request ID is required']);
        return;
    }

    // Get request details
    $stmt = $conn->prepare("SELECT request_id, letter_date, subject, org_name, org_type, address, 
                                   collaboration, outcomes, additional_info, contact_person, position, 
                                   email, phone, status, submitted_at, updated_at 
                            FROM partnership_requests 
                            WHERE request_id = ?");
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $request = $result->fetch_assoc();
    $stmt->close();

    if (!$request) {
        echo json_encode(['status' => 'error', 'message' => 'Request not found']);
        return;
    }

    // Get attachments
    $stmt = $conn->prepare("SELECT attachment_id, original_name, stored_name, file_type, file_size, uploaded_at 
                            FROM partnership_attachments 
                            WHERE request_id = ?");
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();

    $attachments = [];
    while ($row = $result->fetch_assoc()) {
        $attachments[] = $row;
    }
    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'request' => $request,
        'attachments' => $attachments
    ]);
}

// ============================================
// FUNCTION: Get Partner Profile
// ============================================
function getPartnerProfile($conn, $email) {
    if (empty($email)) {
        echo json_encode(['status' => 'error', 'message' => 'Email parameter is required']);
        return;
    }

    // Get most recent organization profile
    $stmt = $conn->prepare("SELECT org_name, org_type, address, contact_person, position, 
                                   email, phone, status, submitted_at, updated_at 
                            FROM partnership_requests 
                            WHERE email = ? 
                            ORDER BY submitted_at DESC 
                            LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $organization = $result->fetch_assoc();
    $stmt->close();

    if (!$organization) {
        echo json_encode(['status' => 'error', 'message' => 'Organization profile not found']);
        return;
    }

    echo json_encode([
        'status' => 'success',
        'organization' => $organization
    ]);
}

// ============================================
// FUNCTION: Get Partner Projects
// ============================================
function getPartnerProjects($conn, $email) {
    if (empty($email)) {
        echo json_encode(['status' => 'error', 'message' => 'Email parameter is required']);
        return;
    }

    // Get approved partnership requests (these could be considered active projects)
    $stmt = $conn->prepare("SELECT request_id as project_id, subject as title, collaboration as description, 
                                   status, submitted_at as created_at 
                            FROM partnership_requests 
                            WHERE email = ? AND status = 'approved' 
                            ORDER BY submitted_at DESC");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    $projects = [];
    while ($row = $result->fetch_assoc()) {
        $projects[] = $row;
    }
    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'projects' => $projects
    ]);
}

// ============================================
// FUNCTION: Get Partner Documents
// ============================================
function getPartnerDocuments($conn, $email) {
    if (empty($email)) {
        echo json_encode(['status' => 'error', 'message' => 'Email parameter is required']);
        return;
    }

    // Get all attachments for this partner's requests
    $stmt = $conn->prepare("SELECT pa.attachment_id, pa.original_name, pa.stored_name, 
                                   pa.file_type, pa.file_size, pa.uploaded_at 
                            FROM partnership_attachments pa
                            INNER JOIN partnership_requests pr ON pa.request_id = pr.request_id
                            WHERE pr.email = ? 
                            ORDER BY pa.uploaded_at DESC");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    $documents = [];
    while ($row = $result->fetch_assoc()) {
        $documents[] = $row;
    }
    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'documents' => $documents
    ]);
}
?>


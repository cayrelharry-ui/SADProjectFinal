<?php
session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

$input = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

if (empty($input) || empty($password)) {
    echo json_encode(['status' => 'error', 'message' => 'Missing username or password.']);
    exit;
}

// Database connection
$host = "localhost";
$db_user = "root";
$db_pass = "";
$db_name = "ccms_portal";

$conn = new mysqli($host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed.']);
    exit;
}

// Prevent issues caused by duplicate full_name
// Normalize input so FULL NAME "JP Elevado" = "jp elevado"
$normalized = strtolower($input);

// Fetch matching user
$stmt = $conn->prepare("
    SELECT user_id, full_name, email, password, role, status 
    FROM users 
    WHERE LOWER(email) = ? OR LOWER(full_name) = ?
    LIMIT 1
");
$stmt->bind_param("ss", $normalized, $normalized);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    echo json_encode(['status' => 'error', 'message' => 'User not found.']);
    exit;
}

$user = $result->fetch_assoc();

// Check status
if ($user['status'] !== 'active') {
    echo json_encode(['status' => 'error', 'message' => 'Account pending approval.']);
    exit;
}

// Verify password
if (!password_verify($password, $user['password'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid password.']);
    exit;
}

// SUCCESS → Create secure session
session_regenerate_id(true);  // prevents session fixation

$_SESSION['user_id'] = $user['user_id'];
$_SESSION['full_name'] = $user['full_name'];
$_SESSION['email'] = $user['email'];
$_SESSION['role'] = $user['role'];
$_SESSION['logged_in'] = true;

// Security metadata
$_SESSION['ip'] = $_SERVER['REMOTE_ADDR'];
$_SESSION['user_agent'] = $_SERVER['HTTP_USER_AGENT'];

echo json_encode([
    'status' => 'success',
    'message' => 'Login successful!',
    'role' => $user['role']
]);

?>

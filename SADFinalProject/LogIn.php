<?php
session_start();
header('Content-Type: application/json');

// --- 1. Include the new connection utility ---
require_once('db_connection.php');
// -------------------------------------------

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

// Normalize input for email or full_name lookup
$normalized = strtolower($input);

// --- 2. Build Supabase API Endpoint (Replaces MySQL SELECT) ---
// Filter where email OR full_name equals the normalized input
$endpoint = "users?select=user_id,full_name,email,password,role,status&or=(email.eq.{$normalized},full_name.eq.{$normalized})&limit=1";

// Use the SERVICE_ROLE_KEY to securely fetch the hashed password
$response = supabase_request($endpoint, 'GET', [], SERVICE_ROLE_KEY);

// Check for communication error
if ($response === false) {
    echo json_encode(['status' => 'error', 'message' => 'Service connection failed.']);
    exit;
}

// Check for successful HTTP status (200 OK)
if ($response['status'] !== 200) {
    echo json_encode(['status' => 'error', 'message' => 'Authentication service error.']);
    exit;
}

$userData = $response['data'];

// The Supabase REST API returns an array of records
if (empty($userData) || count($userData) !== 1) {
    echo json_encode(['status' => 'error', 'message' => 'User not found.']);
    exit;
}

$user = $userData[0]; // Get the first (and only) user object

// --- 3. Verification Logic (Remains the same) ---

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
session_regenerate_id(true); 

$_SESSION['user_id'] = $user['user_id'];
$_SESSION['full_name'] = $user['full_name'];
$_SESSION['email'] = $user['email'];
$_SESSION['role'] = $user['role'];
$_SESSION['logged_in'] = true;

// Security metadata
$_SESSION['ip'] = $_SERVER['REMOTE_ADDR'];
$_SESSION['user_agent'] = $_SERVER['HTTP_USER_AGENT'];

// Determine redirect URL based on role
$redirect_url = '../Home.php'; 

if ($user['role'] === 'admin') {
    $redirect_url = '../HTML/Admin_Panel.php';
}

echo json_encode([
    'status' => 'success',
    'message' => 'Login successful!',
    'role' => $user['role'],
    'user_id' => $user['user_id'],
    'full_name' => $user['full_name'],
    'redirect' => $redirect_url 
]);
?>
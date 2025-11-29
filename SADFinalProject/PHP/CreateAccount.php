<?php
session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fullName = trim($_POST['fullName']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];
    $role = $_POST['role'];

    // Validation
    if (empty($fullName) || empty($email) || empty($password) || empty($role)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid email format.']);
        exit;
    }

    if (strlen($password) < 6) {
        echo json_encode(['status' => 'error', 'message' => 'Password must be at least 6 characters long.']);
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

    // Check if email already exists
    $check_stmt = $conn->prepare("SELECT user_id FROM users WHERE email = ?");
    $check_stmt->bind_param("s", $email);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();

    if ($check_result->num_rows > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Email already exists.']);
        $check_stmt->close();
        $conn->close();
        exit;
    }
    $check_stmt->close();

    // Hash password
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Insert new user with 'inactive' status (pending approval)
    $stmt = $conn->prepare("INSERT INTO users (full_name, email, password, role, status) VALUES (?, ?, ?, ?, 'inactive')");
    $stmt->bind_param("ssss", $fullName, $email, $hashed_password, $role);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Account created successfully! Waiting for administrator approval.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to create account. Please try again.']);
    }

    $stmt->close();
    $conn->close();
    exit;
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}
?>
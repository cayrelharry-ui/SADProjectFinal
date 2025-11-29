<?php
session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = trim($_POST['username']);
    $password = $_POST['password'];

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

    // Get user - check both email and full_name
    $stmt = $conn->prepare("SELECT user_id, full_name, email, password, role, status FROM users WHERE (email = ? OR full_name = ?) LIMIT 1");
    $stmt->bind_param("ss", $input, $input);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        // Check if account is active
        if ($user['status'] !== 'active') {
            echo json_encode(['status' => 'error', 'message' => 'Account pending approval. Please wait for administrator approval.']);
            $stmt->close();
            $conn->close();
            exit;
        }
        
        // Verify password
        if (password_verify($password, $user['password'])) {
            // Login successful
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['full_name'] = $user['full_name'];
            $_SESSION['email'] = $user['email'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['logged_in'] = true;

            echo json_encode([
                'status' => 'success', 
                'message' => 'Login successful!',
                'role' => $user['role']
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid password.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'User not found.']);
    }

    $stmt->close();
    $conn->close();
    exit;
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}
?>
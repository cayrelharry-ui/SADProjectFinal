<?php
// GetCoordinator.php - Get current user information (works for all roles including partners)
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
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

    $userId = $_SESSION['user_id'];

    // Get user information - works for all roles (coordinator, partner, admin, etc.)
    $stmt = $pdo->prepare("SELECT user_id, full_name, email, role, status FROM users WHERE user_id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        echo json_encode([
            'success' => true,
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'user_id' => $user['user_id'],
            'status' => $user['status']
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'User not found'
        ]);
    }

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error'
    ]);
}
exit;
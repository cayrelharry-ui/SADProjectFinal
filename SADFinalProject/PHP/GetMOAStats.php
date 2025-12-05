<?php
session_start();
header('Content-Type: application/json');

// Database connection
$host = 'localhost';
$dbname = 'ccms_portal';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
    $userRole = isset($_SESSION['role']) ? $_SESSION['role'] : 'partner';
    $email = $_GET['email'] ?? '';

    if ($userRole === 'coordinator' && $userId) {
        // Coordinator stats
        $stmt = $pdo->prepare("
            SELECT
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                COUNT(CASE WHEN status IN ('pending', 'under_review') THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
                COUNT(*) as total
            FROM moa_submissions
            WHERE coordinator_id = ?
        ");
        $stmt->execute([$userId]);
    } elseif (!empty($email)) {
        // Partner stats by email
        $stmt = $pdo->prepare("
            SELECT
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                COUNT(CASE WHEN status IN ('pending', 'under_review') THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
                COUNT(*) as total
            FROM moa_submissions
            WHERE rep_email = ?
        ");
        $stmt->execute([$email]);
    } else {
        // Admin stats
        $stmt = $pdo->prepare("
            SELECT
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                COUNT(CASE WHEN status IN ('pending', 'under_review') THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
                COUNT(*) as total
            FROM moa_submissions
        ");
        $stmt->execute();
    }

    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'stats' => $stats
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load statistics',
        'stats' => [
            'active' => 0,
            'pending' => 0,
            'expired' => 0,
            'total' => 0
        ]
    ]);
}
exit;


<?php
session_start();
header('Content-Type: application/json');

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid MOA ID']);
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

    $moaId = $_GET['id'];
    $userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
    $userRole = isset($_SESSION['role']) ? $_SESSION['role'] : 'partner';
    $email = $_GET['email'] ?? '';

    $query = "
        SELECT
            m.*,
            DATE_FORMAT(m.start_date, '%Y-%m-%d') as start_date_formatted,
            DATE_FORMAT(m.end_date, '%Y-%m-%d') as end_date_formatted,
            DATE_FORMAT(m.submission_date, '%Y-%m-%d') as submission_date_formatted
        FROM moa_submissions m
        WHERE m.moa_id = ?
    ";

    if ($userRole === 'coordinator' && $userId) {
        $query .= " AND m.coordinator_id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$moaId, $userId]);
    } elseif (!empty($email)) {
        $query .= " AND m.rep_email = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$moaId, $email]);
    } else {
        $stmt = $pdo->prepare($query);
        $stmt->execute([$moaId]);
    }

    $moa = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$moa) {
        echo json_encode(['success' => false, 'message' => 'MOA not found']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'moa' => $moa
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load MOA details'
    ]);
}
exit;


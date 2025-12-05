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

    // Check if email parameter is provided (for partner dashboard)
    $email = $_GET['email'] ?? '';
    
    if (!isset($_SESSION['user_id']) && empty($email)) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
    $userRole = isset($_SESSION['role']) ? $_SESSION['role'] : 'partner';

    // If email is provided, get MOAs for that partner organization
    if (!empty($email)) {
        $stmt = $pdo->prepare("
            SELECT
                moa_id as id,
                moa_title as title,
                moa_ref_number as ref_number,
                DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
                DATE_FORMAT(end_date, '%Y-%m-%d') as end_date,
                covered_programs as description,
                org_name as partner_org_name,
                status,
                DATE_FORMAT(submission_date, '%Y-%m-%d') as submitted_date,
                TIMESTAMPDIFF(DAY, CURDATE(), end_date) as days_remaining
            FROM moa_submissions
            WHERE rep_email = ?
            ORDER BY submission_date DESC
        ");
        $stmt->execute([$email]);
    } elseif ($userRole === 'coordinator' && $userId) {
        // Coordinator sees their MOAs
        $stmt = $pdo->prepare("
            SELECT
                moa_id as id,
                moa_title as title,
                moa_ref_number as ref_number,
                DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
                DATE_FORMAT(end_date, '%Y-%m-%d') as end_date,
                covered_programs as description,
                org_name as partner_org_name,
                status,
                DATE_FORMAT(submission_date, '%Y-%m-%d') as submitted_date,
                TIMESTAMPDIFF(DAY, CURDATE(), end_date) as days_remaining
            FROM moa_submissions
            WHERE coordinator_id = ?
            ORDER BY submission_date DESC
        ");
        $stmt->execute([$userId]);
    } else {
        // Admin sees all MOAs
        $stmt = $pdo->prepare("
            SELECT
                m.moa_id as id,
                m.moa_title as title,
                m.moa_ref_number as ref_number,
                DATE_FORMAT(m.start_date, '%Y-%m-%d') as start_date,
                DATE_FORMAT(m.end_date, '%Y-%m-%d') as end_date,
                m.covered_programs as description,
                m.org_name as partner_org_name,
                m.status,
                DATE_FORMAT(m.submission_date, '%Y-%m-%d') as submitted_date,
                TIMESTAMPDIFF(DAY, CURDATE(), m.end_date) as days_remaining,
                u.full_name as coordinator_name
            FROM moa_submissions m
            LEFT JOIN users u ON m.coordinator_id = u.user_id
            ORDER BY m.submission_date DESC
        ");
        $stmt->execute();
    }

    $moas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'moas' => $moas
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load MOA data',
        'moas' => []
    ]);
}
exit;


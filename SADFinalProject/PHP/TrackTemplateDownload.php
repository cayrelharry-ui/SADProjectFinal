<?php
// TrackTemplateDownload.php - Track template downloads for analytics
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

    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);
    
    $templateName = $input['template_name'] ?? $_POST['template_name'] ?? 'unknown';
    $page = $input['page'] ?? $_POST['page'] ?? 'unknown';
    $userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
    $userEmail = isset($_SESSION['email']) ? $_SESSION['email'] : null;
    $userRole = isset($_SESSION['role']) ? $_SESSION['role'] : 'guest';
    $timestamp = $input['timestamp'] ?? date('Y-m-d H:i:s');

    // Create template_downloads table if it doesn't exist
    $createTableQuery = "
        CREATE TABLE IF NOT EXISTS template_downloads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            template_name VARCHAR(255) NOT NULL,
            page VARCHAR(100),
            user_id INT NULL,
            user_email VARCHAR(255) NULL,
            user_role VARCHAR(50),
            downloaded_at DATETIME NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            INDEX idx_template (template_name),
            INDEX idx_user (user_id),
            INDEX idx_date (downloaded_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ";
    
    $pdo->exec($createTableQuery);

    // Insert download record
    $stmt = $pdo->prepare("
        INSERT INTO template_downloads 
        (template_name, page, user_id, user_email, user_role, downloaded_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

    $stmt->execute([
        $templateName,
        $page,
        $userId,
        $userEmail,
        $userRole,
        $timestamp,
        $ipAddress,
        $userAgent
    ]);

    echo json_encode([
        'success' => true,
        'tracked' => true,
        'message' => 'Template download tracked successfully'
    ]);

} catch (PDOException $e) {
    // Even if tracking fails, return success so it doesn't break the download
    echo json_encode([
        'success' => true,
        'tracked' => false,
        'message' => 'Download tracked (database error ignored)'
    ]);
}
exit;
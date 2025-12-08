<?php
// includes/db_connection.php

// --- SUPABASE CONFIGURATION ---
// Base URL for your Supabase project's REST API
const SUPABASE_URL = "https://fkdqenrxfanpgmtogiig.supabase.co";

// Key for public access, used for safe data retrieval where RLS is active.
// const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZHFlbnJ4ZmFucGdtdG9naWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDA1NzksImV4cCI6MjA4MDMxNjU3OX0.NSA57GQcxnCpLnqMVlDpf_lvfggb2H-IGGTBL_XYQ4I";

// Key for server-side operations that require full access (like fetching hashed passwords).
// WARNING: This key MUST NOT be exposed on the client-side!
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZHFlbnJ4ZmFucGdtdG9naWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc0MDU3OSwiZXhwIjoyMDgwMzE2NTc5fQ.iMaiBWpQxgC9X7dxDDdoQOwr6Qt0lbPex1JTnCCZS1w";


/**
 * Sends a request to the Supabase PostgREST API endpoint.
 *
 * @param string $endpoint The path and query for the API (e.g., 'users?status=eq.active').
 * @param string $method HTTP method (GET, POST, PATCH, DELETE).
 * @param array $data Data array for POST/PATCH requests.
 * @param string $key API key to use (SERVICE_ROLE_KEY or ANON_KEY).
 * @param string $preferHeader Optional 'Prefer' header for POST/PATCH.
 * @return array|false Returns the decoded JSON response array or false on cURL error.
 */
function supabase_request($endpoint, $method = 'GET', $data = [], $key = SERVICE_ROLE_KEY, $preferHeader = '') {
    // 1. Construct the full URL
    $url = SUPABASE_URL . "/rest/v1/{$endpoint}";
    
    // 2. Setup cURL
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    $headers = [
        "apikey: " . $key,
        "Authorization: Bearer " . $key,
        "Content-Type: application/json",
        "Accept: application/json"
    ];

    // 3. Handle data/payload for POST/PATCH
    if ($method === 'POST' || $method === 'PATCH') {
        $payload = json_encode($data);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        if ($preferHeader) {
            $headers[] = "Prefer: {$preferHeader}";
        }
    }
    
    // 4. Set final headers
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    // 5. Execute
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        // Log the error instead of exposing it to the user
        error_log("Supabase cURL Error: " . curl_error($ch));
        curl_close($ch);
        return false;
    }

    curl_close($ch);

    // 6. Return response body and HTTP code
    return [
        'data' => json_decode($response, true),
        'status' => $http_code
    ];
}
?>
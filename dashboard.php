<?php
// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Your existing code here...
$data = [
    'status' => 'success',
    'total_leads' => 100,
    'total_summe_netto' => 50000.00,
    'data' => [
        'Offen' => 25,
        'in Bearbeitung' => 15,
        'Beauftragung' => 10,
        'EA Beauftragung' => 5,
        'NF Beauftragung' => 5,
        'Nur Info eingeholt' => 8,
        'follow up' => 12,
        'falscher Kunde' => 3,
        'Ghoster' => 4,
        'Abgesagt' => 2,
        'Abgesagt tot' => 1,
        'Storniert' => 1,
        'Außerhalb Einzugsgebiet' => 2
    ]
];

echo json_encode($data);
?>
<?php

declare(strict_types=1);

function dispatch(PDO $db, string $method, array $segments): void
{
    if (($segments[0] ?? '') !== 'api') {
        Http::fail('Route tidak ditemukan.', 404);
    }

    $resource = $segments[1] ?? '';

    switch ($resource) {
        case 'auth':
            handleAuth($db, $method, $segments);
            return;
        case 'employees':
            handleEmployees($db, $method, $segments);
            return;
        case 'attendance':
            handleAttendance($db, $method, $segments);
            return;
        case 'leaves':
            handleLeaves($db, $method, $segments);
            return;
        case 'visits':
            handleVisits($db, $method, $segments);
            return;
        case 'announcements':
            handleAnnouncements($db, $method, $segments);
            return;
        case 'sites':
            handleSites($db, $method, $segments);
            return;
        case 'notifications':
            handleNotifications($db, $method, $segments);
            return;
        case 'dashboard':
            handleDashboard($db, $method, $segments);
            return;
        default:
            Http::fail('Resource tidak ditemukan.', 404);
    }
}

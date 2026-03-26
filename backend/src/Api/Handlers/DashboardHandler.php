<?php

declare(strict_types=1);

function handleDashboard(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && ($segments[2] ?? '') === 'summary') {
        $user = Auth::requireUser($db);

        if (($user['role'] ?? '') === 'admin') {
            $totalEmployees = (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'user'")->fetchColumn();
            $pendingLeaves = (int) $db->query("SELECT COUNT(*) FROM leave_requests WHERE status = 'pending'")->fetchColumn();
            $pendingAttendance = (int) $db->query("SELECT COUNT(*) FROM attendance_records WHERE status = 'pending'")->fetchColumn();
            $activeVisits = (int) $db->query("SELECT COUNT(*) FROM client_visits WHERE status = 'Aktif'")->fetchColumn();

            Http::ok([
                'total_employees' => $totalEmployees,
                'pending_leaves' => $pendingLeaves,
                'pending_attendance' => $pendingAttendance,
                'active_visits' => $activeVisits,
            ]);
        }

        $uid = (int) $user['id'];

        $attendanceTodayStmt = $db->prepare('SELECT COUNT(*) FROM attendance_records WHERE user_id = :uid AND DATE(event_at) = CURDATE()');
        $attendanceTodayStmt->execute(['uid' => $uid]);
        $attendanceToday = (int) $attendanceTodayStmt->fetchColumn();

        $pendingLeaveStmt = $db->prepare("SELECT COUNT(*) FROM leave_requests WHERE user_id = :uid AND status = 'pending'");
        $pendingLeaveStmt->execute(['uid' => $uid]);
        $pendingLeaves = (int) $pendingLeaveStmt->fetchColumn();

        $activeVisitStmt = $db->prepare("SELECT COUNT(*) FROM client_visits WHERE user_id = :uid AND status = 'Aktif'");
        $activeVisitStmt->execute(['uid' => $uid]);
        $activeVisits = (int) $activeVisitStmt->fetchColumn();

        Http::ok([
            'attendance_today' => $attendanceToday,
            'pending_leaves' => $pendingLeaves,
            'active_visits' => $activeVisits,
        ]);
    }

    Http::fail('Route dashboard tidak ditemukan.', 404);
}

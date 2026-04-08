<?php

declare(strict_types=1);

function handleNotifications(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        $user = Auth::requireUser($db);

        $stmt = $db->prepare('SELECT id, title, message, notification_type, related_type, related_id, is_read, created_at
                              FROM user_notifications
                              WHERE user_id = :user_id
                              ORDER BY created_at DESC');
        $stmt->execute(['user_id' => (int) $user['id']]);

        Http::ok(['notifications' => $stmt->fetchAll()]);
    }

    if ($method === 'POST' && count($segments) === 2) {
        $user = Auth::requireUser($db);
        $body = Http::body();

        $targetUserId = isset($body['user_id']) ? (int) $body['user_id'] : (int) $user['id'];
        if (($user['role'] ?? '') !== 'admin' && $targetUserId !== (int) $user['id']) {
            Http::fail('Tidak boleh membuat notifikasi untuk user lain.', 403);
        }

        $stmt = $db->prepare('INSERT INTO user_notifications (user_id, title, message, notification_type, related_type, related_id, is_read)
                              VALUES (:user_id, :title, :message, :notification_type, :related_type, :related_id, 0)');
        $stmt->execute([
            'user_id' => $targetUserId,
            'title' => trim((string) ($body['title'] ?? 'Info')),
            'message' => trim((string) ($body['message'] ?? '')),
            'notification_type' => trim((string) ($body['notification_type'] ?? 'info')),
            'related_type' => isset($body['related_type']) ? trim((string) $body['related_type']) : null,
            'related_id' => isset($body['related_id']) ? (int) $body['related_id'] : null,
        ]);

        Http::ok(['notification_id' => (int) $db->lastInsertId()], 'Notifikasi dibuat.');
    }

    if ($method === 'PATCH' && count($segments) === 4 && $segments[3] === 'read') {
        $user = Auth::requireUser($db);
        $id = (int) $segments[2];

        $stmt = $db->prepare('UPDATE user_notifications SET is_read = 1 WHERE id = :id AND user_id = :user_id');
        $stmt->execute([
            'id' => $id,
            'user_id' => (int) $user['id'],
        ]);

        Http::ok([], 'Notifikasi ditandai sudah dibaca.');
    }

    Http::fail('Route notifications tidak ditemukan.', 404);
}

function triggerNotification(PDO $db, int $userId, string $title, string $message, string $type = 'info', ?string $relatedType = null, ?int $relatedId = null): void
{
    $stmt = $db->prepare('INSERT INTO user_notifications (user_id, title, message, notification_type, related_type, related_id, is_read)
                          VALUES (:user_id, :title, :message, :notification_type, :related_type, :related_id, 0)');
    $stmt->execute([
        'user_id' => $userId,
        'title' => $title,
        'message' => $message,
        'notification_type' => $type,
        'related_type' => $relatedType,
        'related_id' => $relatedId,
    ]);
}

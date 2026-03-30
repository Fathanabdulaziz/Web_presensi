<?php

declare(strict_types=1);

function handleAnnouncements(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        Auth::requireUser($db);

        $stmt = $db->query('SELECT a.id, a.title, a.category, a.content, a.publish_date, a.priority, a.target_division, u.name AS author_name, a.created_at
                            FROM announcements a
                            LEFT JOIN users u ON u.id = a.author_user_id
                            ORDER BY a.publish_date DESC, a.created_at DESC');

        $items = $stmt->fetchAll();

        if (!empty($items)) {
            $announcementIds = array_map(static fn(array $item): int => (int) $item['id'], $items);
            $placeholders = implode(',', array_fill(0, count($announcementIds), '?'));

            $attStmt = $db->prepare('SELECT id, announcement_id, name, stored_name, mime_type, size_bytes, data_url, converted_to_webp
                                     FROM announcement_attachments
                                     WHERE announcement_id IN (' . $placeholders . ')
                                     ORDER BY id ASC');
            $attStmt->execute($announcementIds);
            $attachments = $attStmt->fetchAll();

            $attachmentsByAnnouncement = [];
            foreach ($attachments as $attachment) {
                $aid = (int) $attachment['announcement_id'];
                if (!isset($attachmentsByAnnouncement[$aid])) {
                    $attachmentsByAnnouncement[$aid] = [];
                }
                $attachmentsByAnnouncement[$aid][] = $attachment;
            }

            foreach ($items as &$item) {
                $aid = (int) ($item['id'] ?? 0);
                $item['attachments'] = $attachmentsByAnnouncement[$aid] ?? [];
            }
            unset($item);
        }

        Http::ok(['announcements' => $items]);
    }

    if ($method === 'POST' && count($segments) === 2) {
        $admin = Auth::requireRoles($db, ['admin', 'hr']);
        $body = Http::body();

        $title = trim((string) ($body['title'] ?? ''));
        $category = trim((string) ($body['category'] ?? 'General'));
        $content = trim((string) ($body['content'] ?? ''));

        if ($title === '' || $content === '') {
            Http::fail('Judul dan konten pengumuman wajib diisi.', 422);
        }
        if (strlen($title) > 255) {
            Http::fail('Judul pengumuman terlalu panjang.', 422);
        }
        if (strlen($content) > 10000) {
            Http::fail('Konten pengumuman terlalu panjang.', 422);
        }

        $stmt = $db->prepare('INSERT INTO announcements (title, category, content, publish_date, author_user_id, priority, target_division)
                              VALUES (:title, :category, :content, :publish_date, :author_user_id, :priority, :target_division)');

        $stmt->execute([
            'title' => $title,
            'category' => $category,
            'content' => $content,
            'publish_date' => nullableDate($body['publish_date'] ?? $body['date'] ?? date('Y-m-d')),
            'author_user_id' => (int) $admin['id'],
            'priority' => (string) ($body['priority'] ?? 'Normal'),
            'target_division' => (string) ($body['target_division'] ?? 'Semua Divisi'),
        ]);

        $announcementId = (int) $db->lastInsertId();

        $attachments = $body['attachments'] ?? [];
        if (is_array($attachments)) {
            $insertAtt = $db->prepare('INSERT INTO announcement_attachments
                (announcement_id, name, stored_name, mime_type, size_bytes, data_url, converted_to_webp)
                VALUES
                (:announcement_id, :name, :stored_name, :mime_type, :size_bytes, :data_url, :converted_to_webp)');

            foreach ($attachments as $att) {
                if (!is_array($att)) {
                    continue;
                }

                validateAttachmentPayload($att, 'Lampiran pengumuman');

                $insertAtt->execute([
                    'announcement_id' => $announcementId,
                    'name' => (string) ($att['name'] ?? 'attachment'),
                    'stored_name' => (string) ($att['stored_name'] ?? $att['name'] ?? uniqid('att_', true)),
                    'mime_type' => nullableString($att['mime_type'] ?? null),
                    'size_bytes' => isset($att['size_bytes']) ? (int) $att['size_bytes'] : null,
                    'data_url' => (string) ($att['data_url'] ?? ''),
                    'converted_to_webp' => !empty($att['converted_to_webp']) ? 1 : 0,
                ]);
            }
        }

        Http::ok(['announcement_id' => $announcementId], 'Pengumuman berhasil dibuat.');
    }

    if ($method === 'PUT' && count($segments) === 3) {
        Auth::requireRoles($db, ['admin', 'hr']);
        $id = (int) $segments[2];
        $body = Http::body();

        $nextTitle = trim((string) ($body['title'] ?? ''));
        $nextContent = trim((string) ($body['content'] ?? ''));
        if ($nextTitle === '' || $nextContent === '') {
            Http::fail('Judul dan konten pengumuman wajib diisi.', 422);
        }
        if (strlen($nextTitle) > 255) {
            Http::fail('Judul pengumuman terlalu panjang.', 422);
        }
        if (strlen($nextContent) > 10000) {
            Http::fail('Konten pengumuman terlalu panjang.', 422);
        }

        $stmt = $db->prepare('UPDATE announcements SET
            title = :title,
            category = :category,
            content = :content,
            publish_date = :publish_date,
            priority = :priority,
            target_division = :target_division
            WHERE id = :id');

        $stmt->execute([
            'id' => $id,
            'title' => $nextTitle,
            'category' => trim((string) ($body['category'] ?? 'General')),
            'content' => $nextContent,
            'publish_date' => nullableDate($body['publish_date'] ?? $body['date'] ?? date('Y-m-d')),
            'priority' => (string) ($body['priority'] ?? 'Normal'),
            'target_division' => (string) ($body['target_division'] ?? 'Semua Divisi'),
        ]);

        if (array_key_exists('attachments', $body) && is_array($body['attachments'])) {
            $delAtt = $db->prepare('DELETE FROM announcement_attachments WHERE announcement_id = :announcement_id');
            $delAtt->execute(['announcement_id' => $id]);

            $insertAtt = $db->prepare('INSERT INTO announcement_attachments
                (announcement_id, name, stored_name, mime_type, size_bytes, data_url, converted_to_webp)
                VALUES
                (:announcement_id, :name, :stored_name, :mime_type, :size_bytes, :data_url, :converted_to_webp)');

            foreach ($body['attachments'] as $att) {
                if (!is_array($att)) {
                    continue;
                }

                validateAttachmentPayload($att, 'Lampiran pengumuman');

                $insertAtt->execute([
                    'announcement_id' => $id,
                    'name' => (string) ($att['name'] ?? 'attachment'),
                    'stored_name' => (string) ($att['stored_name'] ?? $att['name'] ?? uniqid('att_', true)),
                    'mime_type' => nullableString($att['mime_type'] ?? null),
                    'size_bytes' => isset($att['size_bytes']) ? (int) $att['size_bytes'] : null,
                    'data_url' => (string) ($att['data_url'] ?? ''),
                    'converted_to_webp' => !empty($att['converted_to_webp']) ? 1 : 0,
                ]);
            }
        }

        Http::ok([], 'Pengumuman diperbarui.');
    }

    if ($method === 'DELETE' && count($segments) === 3) {
        Auth::requireRoles($db, ['admin', 'hr']);
        $id = (int) $segments[2];

        $stmt = $db->prepare('DELETE FROM announcements WHERE id = :id');
        $stmt->execute(['id' => $id]);

        Http::ok([], 'Pengumuman dihapus.');
    }

    Http::fail('Route announcements tidak ditemukan.', 404);
}

<?php

declare(strict_types=1);

function handleSites(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        Auth::requireUser($db);
        $stmt = $db->query('SELECT id, name, created_by, created_at FROM sites ORDER BY name ASC');
        Http::ok(['sites' => $stmt->fetchAll()]);
    }

    if ($method === 'POST' && count($segments) === 2) {
        $admin = Auth::requireRole($db, 'admin');
        $body = Http::body();

        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            Http::fail('Nama site wajib diisi.', 422);
        }

        $stmt = $db->prepare('INSERT INTO sites (name, created_by) VALUES (:name, :created_by)');
        $stmt->execute([
            'name' => $name,
            'created_by' => (int) $admin['id'],
        ]);

        Http::ok(['site_id' => (int) $db->lastInsertId()], 'Site berhasil ditambahkan.');
    }

    if ($method === 'DELETE' && count($segments) === 3) {
        Auth::requireRole($db, 'admin');
        $id = (int) $segments[2];

        $stmt = $db->prepare('DELETE FROM sites WHERE id = :id');
        $stmt->execute(['id' => $id]);

        Http::ok([], 'Site dihapus.');
    }

    Http::fail('Route sites tidak ditemukan.', 404);
}

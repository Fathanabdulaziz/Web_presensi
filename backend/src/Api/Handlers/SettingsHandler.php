<?php

declare(strict_types=1);

/**
 * SettingsHandler - Handles system configurations and work locations
 */
function handleSettings(PDO $db, string $method, array $segments): void
{
    $resource = $segments[2] ?? '';

    // Standard CRUD for Work Locations
    if ($resource === 'work-locations') {
        if ($method === 'GET') {
            try {
                // Publicly accessible for users to get their check-in points
                $stmt = $db->query('SELECT * FROM work_locations WHERE is_active = 1 ORDER BY id ASC');
                $locations = $stmt->fetchAll();
                
                // Get all mapped sites
                $sitesStmt = $db->query('SELECT id, name, work_location_id FROM sites');
                $allSites = $sitesStmt->fetchAll();
                
                foreach ($locations as &$loc) {
                    $locId = $loc['id'];
                    $loc['sites'] = array_values(array_filter($allSites, function($s) use ($locId) {
                        return (int)$s['work_location_id'] === (int)$locId;
                    }));
                }

                Http::ok(['work_locations' => $locations]);
            } catch (Exception $e) {
                Http::fail('DB Error: ' . $e->getMessage(), 500);
            }
        }

        if ($method === 'POST') {
            $admin = Auth::requireRoles($db, ['admin', 'bod']);
            $body = Http::body();

            $code = trim((string)($body['code'] ?? ''));
            $name = trim((string)($body['name'] ?? ''));
            $lat = (float)($body['latitude'] ?? 0);
            $lng = (float)($body['longitude'] ?? 0);
            $radius = (int)($body['radius_meters'] ?? 200);
            $sitesRaw = trim((string)($body['site_names'] ?? ''));

            if ($code === '' || $name === '') {
                Http::fail('Kode dan Nama lokasi wajib diisi.', 422);
            }

            $db->beginTransaction();
            try {
                $stmt = $db->prepare('INSERT INTO work_locations (code, name, latitude, longitude, radius_meters) VALUES (:code, :name, :lat, :lng, :radius)');
                $stmt->execute([
                    'code' => $code,
                    'name' => $name,
                    'lat' => $lat,
                    'lng' => $lng,
                    'radius' => $radius
                ]);
                $locId = (int)$db->lastInsertId();

                if ($sitesRaw !== '') {
                    $sitesList = array_map('trim', explode(',', $sitesRaw));
                    $stmtSite = $db->prepare('INSERT INTO sites (name, work_location_id, created_by) VALUES (:name, :wl_id, :c_by)');
                    foreach ($sitesList as $s) {
                        if ($s !== '') {
                            $stmtSite->execute(['name' => $s, 'wl_id' => $locId, 'c_by' => $admin['id']]);
                        }
                    }
                }
                $db->commit();
                Http::ok(['id' => $locId], 'Lokasi kerja dan site berhasil ditambahkan.');
            } catch (Exception $e) {
                $db->rollBack();
                Http::fail('Gagal menyimpan ke database.', 500);
            }
        }

        if ($method === 'PUT' && isset($segments[3])) {
            Auth::requireRoles($db, ['admin', 'bod']);
            $id = (int)$segments[3];
            $body = Http::body();

            $code = trim((string)($body['code'] ?? ''));
            $name = trim((string)($body['name'] ?? ''));
            $lat = (float)($body['latitude'] ?? 0);
            $lng = (float)($body['longitude'] ?? 0);
            $radius = (int)($body['radius_meters'] ?? 200);
            $isActive = (int)($body['is_active'] ?? 1);
            $sitesRaw = trim((string)($body['site_names'] ?? ''));

            $db->beginTransaction();
            try {
                $stmt = $db->prepare('UPDATE work_locations SET code = :code, name = :name, latitude = :lat, longitude = :lng, radius_meters = :radius, is_active = :is_active WHERE id = :id');
                $stmt->execute([
                    'code' => $code,
                    'name' => $name,
                    'lat' => $lat,
                    'lng' => $lng,
                    'radius' => $radius,
                    'is_active' => $isActive,
                    'id' => $id
                ]);

                // Sync sites logic: Remove old sites for this location and add new ones
                if (isset($body['site_names'])) {
                    // We only delete sites that were mapped to this location
                    $db->prepare('DELETE FROM sites WHERE work_location_id = :id')->execute(['id' => $id]);
                    if ($sitesRaw !== '') {
                        $sitesList = array_map('trim', explode(',', $sitesRaw));
                        $stmtSite = $db->prepare('INSERT INTO sites (name, work_location_id, created_by) VALUES (:name, :wl_id, :c_by)');
                        foreach ($sitesList as $s) {
                            if ($s !== '') {
                                $stmtSite->execute(['name' => $s, 'wl_id' => $id, 'c_by' => Auth::userId()]);
                            }
                        }
                    }
                }
                $db->commit();
                Http::ok([], 'Lokasi kerja berhasil diperbarui.');
            } catch (Exception $e) {
                $db->rollBack();
                Http::fail('Gagal memperbarui ke database.', 500);
            }
        }

        if ($method === 'DELETE' && isset($segments[3])) {
            Auth::requireRoles($db, ['admin', 'bod']);
            $id = (int)$segments[3];

            $stmt = $db->prepare('DELETE FROM work_locations WHERE id = :id');
            $stmt->execute(['id' => $id]);

            Http::ok([], 'Lokasi kerja berhasil dihapus.');
        }
    }

    // System Settings (like Global Radius)
    if ($resource === 'attendance') {
        if ($method === 'GET') {
            $stmt = $db->query('SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE "attendance_%"');
            $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            Http::ok(['settings' => $settings]);
        }

        if ($method === 'PATCH') {
            Auth::requireRoles($db, ['admin', 'bod']);
            $body = Http::body();

            foreach ($body as $key => $value) {
                if (!str_starts_with($key, 'attendance_')) continue;

                $stmt = $db->prepare('INSERT INTO system_settings (setting_key, setting_value) VALUES (:key, :value) ON DUPLICATE KEY UPDATE setting_value = :value');
                $stmt->execute([
                    'key' => (string)$key,
                    'value' => (string)$value
                ]);
            }

            Http::ok([], 'Setelan presensi berhasil diperbarui.');
        }
    }

    Http::fail('Resource settings tidak ditemukan.', 404);
}

<?php

declare(strict_types=1);

function nullableString(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }

    $text = trim((string) $value);
    return $text === '' ? null : $text;
}

function nullableDate(mixed $value): ?string
{
    $text = nullableString($value);
    if ($text === null) {
        return null;
    }

    $timestamp = strtotime($text);
    return $timestamp === false ? null : date('Y-m-d', $timestamp);
}

function nullableDateTime(mixed $value): ?string
{
    $text = nullableString($value);
    if ($text === null) {
        return null;
    }

    $timestamp = strtotime($text);
    return $timestamp === false ? null : date('Y-m-d H:i:s', $timestamp);
}

function nullableTime(mixed $value): ?string
{
    $text = nullableString($value);
    if ($text === null) {
        return null;
    }

    $timestamp = strtotime($text);
    return $timestamp === false ? null : date('H:i:s', $timestamp);
}

function assertVisitEditable(PDO $db, int $visitId, array $user): void
{
    $stmt = $db->prepare('SELECT user_id FROM client_visits WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $visitId]);
    $visit = $stmt->fetch();

    if (!$visit) {
        Http::fail('Kunjungan tidak ditemukan.', 404);
    }

    $canEdit = in_array($user['role'] ?? '', ['admin', 'hr', 'bod', 'manager', 'finance'], true);
    $isOwner = (int) $visit['user_id'] === (int) $user['id'];

    if (!$canEdit && !$isOwner) {
        Http::fail('Tidak punya akses data kunjungan ini.', 403);
    }
}

function countDateRangeDays(string $startDate, string $endDate): int
{
    $start = strtotime($startDate);
    $end = strtotime($endDate);

    if ($start === false || $end === false || $end < $start) {
        return 1;
    }

    return (int) floor(($end - $start) / 86400) + 1;
}

function validateAttachmentPayload(array $attachment, string $context = 'Lampiran', int $maxBytes = 5_242_880): void
{
    $size = isset($attachment['size_bytes'])
        ? (int) $attachment['size_bytes']
        : (isset($attachment['attachment_size']) ? (int) $attachment['attachment_size'] : 0);

    if ($size < 0 || $size > $maxBytes) {
        Http::fail($context . ' melebihi batas ukuran maksimal.', 422);
    }

    $mime = strtolower((string) nullableString($attachment['mime_type'] ?? $attachment['attachment_type'] ?? null));
    if ($mime !== '') {
        $allowed = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
        ];
        if (!in_array($mime, $allowed, true)) {
            Http::fail($context . ' memiliki tipe file yang tidak diizinkan.', 422);
        }
    }

    $name = nullableString($attachment['name'] ?? $attachment['attachment_name'] ?? null);
    if ($name !== null && strlen($name) > 255) {
        Http::fail($context . ' memiliki nama file terlalu panjang.', 422);
    }

    $dataUrl = nullableString($attachment['data_url'] ?? $attachment['attachment_data'] ?? null);
    if ($dataUrl !== null && strlen($dataUrl) > ($maxBytes * 2 + 1024)) {
        Http::fail($context . ' tidak valid atau terlalu besar.', 422);
    }
}

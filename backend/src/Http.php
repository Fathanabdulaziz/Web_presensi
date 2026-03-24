<?php

declare(strict_types=1);

final class Http
{
    public static function json(mixed $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function body(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            self::json([
                'success' => false,
                'message' => 'Body JSON tidak valid.',
            ], 422);
        }

        return $decoded;
    }

    public static function ok(array $data = [], string $message = 'OK'): void
    {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ]);
    }

    public static function fail(string $message, int $status = 400, array $errors = []): void
    {
        self::json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }
}

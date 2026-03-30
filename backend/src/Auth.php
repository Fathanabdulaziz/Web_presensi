<?php

declare(strict_types=1);

final class Auth
{
    public const SESSION_KEY = 'auth_user_id';

    public static function login(int $userId): void
    {
        session_regenerate_id(true);
        $_SESSION[self::SESSION_KEY] = $userId;
    }

    public static function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
        }
        session_destroy();
    }

    public static function userId(): ?int
    {
        $value = $_SESSION[self::SESSION_KEY] ?? null;
        if ($value === null) {
            return null;
        }

        return (int) $value;
    }

    public static function user(PDO $db): ?array
    {
        $id = self::userId();
        if ($id === null) {
            return null;
        }

        $stmt = $db->prepare('SELECT id, username, name, email, role, provider, is_active, created_at FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public static function requireUser(PDO $db): array
    {
        $user = self::user($db);
        if (!$user) {
            Http::fail('Unauthorized.', 401);
        }

        return $user;
    }

    public static function requireRole(PDO $db, string $role): array
    {
        $user = self::requireUser($db);
        if (($user['role'] ?? '') !== $role) {
            Http::fail('Forbidden.', 403);
        }

        return $user;
    }

    public static function requireRoles(PDO $db, array $roles): array
    {
        $user = self::requireUser($db);
        if (!in_array($user['role'] ?? '', $roles, true)) {
            Http::fail('Forbidden. Membutuhkan akses tingkat lanjut.', 403);
        }

        return $user;
    }
}

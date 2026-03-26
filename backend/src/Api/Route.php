<?php

declare(strict_types=1);

function resolveRoute(): string
{
    $route = trim((string) ($_GET['route'] ?? ''), '/');
    if ($route !== '') {
        return $route;
    }

    $path = trim((string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH), '/');

    if ($path === '') {
        return '';
    }

    $parts = explode('/', $path);
    $apiIndex = array_search('api', $parts, true);

    if ($apiIndex === false) {
        return $path;
    }

    return implode('/', array_slice($parts, $apiIndex));
}

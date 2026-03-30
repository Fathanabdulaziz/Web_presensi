<?php

declare(strict_types=1);

/**
 * Mailer — wrapper PHPMailer untuk sistem presensi.
 *
 * Konfigurasi via environment variable:
 *   SMTP_HOST     — server SMTP (default: smtp.gmail.com)
 *   SMTP_PORT     — port SMTP (default: 587)
 *   SMTP_USER     — akun email pengirim
 *   SMTP_PASS     — password / App Password akun pengirim
 *   SMTP_FROM     — alamat "From" (default = SMTP_USER)
 *   SMTP_FROM_NAME — nama pengirim (default: PT.GlobalNine)
 *   SMTP_SECURE   — 'tls' atau 'ssl' (default: tls)
 */
final class Mailer
{
    /**
     * Kirim email HTML.
     *
     * @throws \RuntimeException Jika pengiriman gagal
     */
    public static function send(
        string $toEmail,
        string $toName,
        string $subject,
        string $htmlBody
    ): void {
        $smtpHost = trim((string) ($_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST') ?: 'smtp.gmail.com'));
        $smtpUser = trim((string) ($_ENV['SMTP_USER'] ?? getenv('SMTP_USER') ?: ''));
        $smtpPass = trim((string) ($_ENV['SMTP_PASS'] ?? getenv('SMTP_PASS') ?: ''));
        $smtpPort = (int)   ($_ENV['SMTP_PORT'] ?? getenv('SMTP_PORT') ?: 587);
        $smtpSecure = strtolower(trim((string) ($_ENV['SMTP_SECURE'] ?? getenv('SMTP_SECURE') ?: 'tls')));
        $fromEmail  = trim((string) ($_ENV['SMTP_FROM'] ?? getenv('SMTP_FROM') ?: $smtpUser));
        $fromName   = trim((string) ($_ENV['SMTP_FROM_NAME'] ?? getenv('SMTP_FROM_NAME') ?: 'PT.GlobalNine'));

        // Cari autoloader PHPMailer (pakai Composer jika ada)
        $composerAutoload = __DIR__ . '/../vendor/autoload.php';
        if (!file_exists($composerAutoload)) {
            throw new \RuntimeException('PHPMailer tidak ditemukan. Jalankan: cd backend && composer install');
        }

        require_once $composerAutoload;

        if ($smtpUser === '' || $smtpPass === ''
            || str_contains($smtpUser, 'emailanda@')
            || str_starts_with($smtpPass, 'xxxx')
        ) {
            throw new \RuntimeException(
                'Konfigurasi SMTP belum diisi. Buka file backend/.env dan isi SMTP_USER dan SMTP_PASS dengan kredensial Gmail Anda. ' .
                'Panduan: myaccount.google.com/apppasswords'
            );
        }

        $mailer = new \PHPMailer\PHPMailer\PHPMailer(true);

        // Server SMTP
        $mailer->isSMTP();
        $mailer->Host       = $smtpHost;
        $mailer->SMTPAuth   = true;
        $mailer->Username   = $smtpUser;
        $mailer->Password   = $smtpPass;
        $mailer->SMTPSecure = $smtpSecure === 'ssl'
            ? \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS
            : \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mailer->Port       = $smtpPort;
        $mailer->CharSet    = 'UTF-8';
        $mailer->Timeout    = 15;

        // Pengirim & penerima
        $mailer->setFrom($fromEmail, $fromName);
        $mailer->addAddress($toEmail, $toName);

        // Konten
        $mailer->isHTML(true);
        $mailer->Subject = $subject;
        $mailer->Body    = $htmlBody;
        // Versi plain text sederhana
        $mailer->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody));

        $mailer->send();
    }
}

-- ============================================================
-- PokerRoyale - Complete USA/USD Master Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS `poker_royale` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `poker_royale`;

-- 1. DROP EXISTING TABLES IF ANY (Clean Reset)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `ticket_messages`;
DROP TABLE IF EXISTS `support_tickets`;
DROP TABLE IF EXISTS `promotions`;
DROP TABLE IF EXISTS `kyc_verifications`;
DROP TABLE IF EXISTS `tournament_registrations`;
DROP TABLE IF EXISTS `tournaments`;
DROP TABLE IF EXISTS `hand_actions`;
DROP TABLE IF EXISTS `hands`;
DROP TABLE IF EXISTS `table_seats`;
DROP TABLE IF EXISTS `game_tables`;
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `wallets`;
DROP TABLE IF EXISTS `audit_log`;
DROP TABLE IF EXISTS `fraud_alerts`;
DROP TABLE IF EXISTS `login_history`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 2. USERS TABLE (LONGTEXT Avatar for Base64 Images + Phone + OTP)
-- ============================================================
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar` LONGTEXT NULL, -- Supports High-Res Base64 Uploads!
  `is_verified` TINYINT(1) DEFAULT 0,
  `otp_code` VARCHAR(10) NULL,
  `otp_expires_at` DATETIME NULL,
  `is_admin` TINYINT(1) DEFAULT 0,
  `games_played` INT DEFAULT 0,
  `hands_played` INT DEFAULT 0,
  `tournaments_won` INT DEFAULT 0,
  `total_earned` DECIMAL(15,2) DEFAULT 0.00,
  `win_rate` INT DEFAULT 0,
  `loyalty_points` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. WALLETS TABLE (USD Currency)
-- ============================================================
CREATE TABLE `wallets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `balance` DECIMAL(15,2) DEFAULT 1000.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. TRANSACTIONS TABLE (PayPal, CashApp, Crypto, Card)
-- ============================================================
CREATE TABLE `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `type` ENUM('DEPOSIT', 'WITHDRAWAL', 'GAME_WIN', 'GAME_LOSS', 'BONUS') NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'PayPal', -- PayPal, CashApp, Crypto, Bank, Card
  `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REJECTED') DEFAULT 'COMPLETED',
  `transaction_ref` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. GAME TABLES
-- ============================================================
CREATE TABLE `game_tables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `game_type` ENUM('TEXAS_HOLDEM', 'OMAHA', 'SHORT_DECK') DEFAULT 'TEXAS_HOLDEM',
  `small_blind` DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  `big_blind` DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  `min_buyin` DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  `max_buyin` DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
  `max_seats` INT DEFAULT 9,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. SYSTEM SETTINGS
-- ============================================================
CREATE TABLE `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(50) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. SEED DATA (Default Admin, Sample Tables & Settings)
-- ============================================================

-- Default Settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`) VALUES
('currency_symbol', '$'),
('currency_code', 'USD'),
('site_title', 'PokerRoyale VIP'),
('min_deposit', '10.00'),
('min_withdrawal', '20.00');

-- Default Sample Tables (USD Blinds)
INSERT INTO `game_tables` (`id`, `name`, `game_type`, `small_blind`, `big_blind`, `min_buyin`, `max_buyin`, `max_seats`) VALUES
(1, 'VIP High Rollers #1', 'TEXAS_HOLDEM', 5.00, 10.00, 100.00, 1000.00, 9),
(2, 'Omaha Masters #2', 'OMAHA', 10.00, 20.00, 200.00, 2000.00, 9),
(3, 'Short Deck Arena #3', 'SHORT_DECK', 25.00, 50.00, 500.00, 5000.00, 6);

-- Sample Test Admin (Password: admin123 -> $2b$10$w8T0M4Bv5M...)
INSERT INTO `users` (`id`, `username`, `email`, `phone`, `password_hash`, `is_verified`, `is_admin`, `games_played`, `hands_played`, `tournaments_won`, `total_earned`) VALUES
(1, 'AdminUser', 'admin@pokerroyale.com', '+1 555-0199', '$2b$10$3zR1zW6K.L.p2zO44mE/u.S7R1zW6K.L.p2zO44mE/u.S7R1zW6K', 1, 1, 100, 2500, 15, 12500.00),
(2, 'Ali Khan', 'ali@gmail.com', '+1 555-0123', '$2b$10$3zR1zW6K.L.p2zO44mE/u.S7R1zW6K.L.p2zO44mE/u.S7R1zW6K', 1, 0, 1247, 34892, 23, 35000.00);

-- Wallets for Default Users ($10,000 Starting USD Balance)
INSERT INTO `wallets` (`user_id`, `balance`) VALUES
(1, 25000.00),
(2, 10000.00);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
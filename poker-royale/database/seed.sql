-- ═══════════════════════════════════════════════════════
-- POKER ROYALE — COMPLETE SEED DATA (USD)
-- Database: poker_royale_db
-- ═══════════════════════════════════════════════════════

USE poker_royale_db;

-- Clear previous seed data safely
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE users;
TRUNCATE TABLE wallets;
TRUNCATE TABLE system_settings;
TRUNCATE TABLE game_tables;
TRUNCATE TABLE tournaments;
TRUNCATE TABLE promotions;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. INSERT SUPER ADMIN ACCOUNT
-- Login Email: admin@pokerroyale.com
-- Login Username: superadmin
-- Login Password: Admin@123456
INSERT INTO users (
    id, username, email, phone, password_hash, full_name, date_of_birth, country, account_status, phone_verified, email_verified, is_admin, admin_role, referral_code
) VALUES (
    1, 'superadmin', 'admin@pokerroyale.com', '+10000000000',
    '$2b$10$eO0M5bXz4R3tF1yV7kHq6eK9uK1vN4qR2sT5uV8wX1yZ3aB5cD7eG',
    'Super Administrator', '1990-01-01', 'United States', 'active', 1, 1, 1, 'super_admin', 'ADMIN001'
);

-- 2. INSERT DEMO PLAYER ACCOUNTS
INSERT INTO users (
    id, username, email, phone, password_hash, full_name, date_of_birth, country, account_status, phone_verified, email_verified, is_admin, referral_code, vip_tier, total_earned
) VALUES 
(2, 'poker_king', 'ali@gmail.com', '+13111111111', '$2b$10$eO0M5bXz4R3tF1yV7kHq6eK9uK1vN4qR2sT5uV8wX1yZ3aB5cD7eG', 'Ali Khan', '1995-05-15', 'United States', 'active', 1, 1, 0, 'ALI2025', 'gold', 12500.00),
(3, 'bluff_queen', 'sara@gmail.com', '+13222222222', '$2b$10$eO0M5bXz4R3tF1yV7kHq6eK9uK1vN4qR2sT5uV8wX1yZ3aB5cD7eG', 'Sara Malik', '1998-08-20', 'United Kingdom', 'active', 1, 1, 0, 'SARA2025', 'platinum', 8750.00),
(4, 'ace_master', 'ahmed@gmail.com', '+13333333333', '$2b$10$eO0M5bXz4R3tF1yV7kHq6eK9uK1vN4qR2sT5uV8wX1yZ3aB5cD7eG', 'Ahmed Raza', '1992-03-10', 'UAE', 'active', 1, 1, 0, 'AHMED2025', 'silver', 5200.00);

-- 3. INSERT WALLET BALANCES (USD)
INSERT INTO wallets (user_id, real_balance, bonus_balance, total_deposited, total_withdrawn, currency) VALUES 
(1, 100000.00, 0.00, 0.00, 0.00, 'USD'),
(2, 25000.00, 500.00, 5000.00, 3500.00, 'USD'),
(3, 3200.00, 250.00, 8000.00, 4500.00, 'USD'),
(4, 750.00, 100.00, 2000.00, 1200.00, 'USD');

-- 4. INSERT DEMO CASH GAME TABLES
INSERT INTO game_tables (table_id, table_name, game_type, betting_type, small_blind, big_blind, min_buyin, max_buyin, max_players, current_players, status, total_pot) VALUES 
(1, 'Royal Flush Lounge', 'texas_holdem', 'no_limit', 2.00, 5.00, 100.00, 500.00, 9, 7, 'active', 1250.00),
(2, 'Diamond Players VIP', 'texas_holdem', 'no_limit', 10.00, 25.00, 500.00, 2500.00, 9, 9, 'active', 4500.00),
(3, 'Omaha Masters', 'omaha', 'pot_limit', 5.00, 10.00, 200.00, 1000.00, 6, 6, 'active', 1820.00),
(4, 'High Roller Suite', 'texas_holdem', 'no_limit', 50.00, 100.00, 2000.00, 10000.00, 6, 4, 'active', 12500.00);

-- 5. INSERT DEMO TOURNAMENTS
INSERT INTO tournaments (tournament_id, tournament_name, game_type, tournament_type, buyin_amount, entry_fee, guaranteed_prize, starting_chips, max_players, current_players, status, start_time) VALUES 
(1, 'Sunday Million Championship', 'texas_holdem', 'freezeout', 250.00, 25.00, 50000.00, 20000, 1000, 642, 'registration', DATE_ADD(NOW(), INTERVAL 2 DAY)),
(2, 'Daily FreeRoll Bonanza', 'texas_holdem', 'freeroll', 0.00, 0.00, 2500.00, 5000, 2000, 1420, 'registration', DATE_ADD(NOW(), INTERVAL 3 HOUR)),
(3, 'High Roller Super Stakes', 'texas_holdem', 'freezeout', 1000.00, 50.00, 25000.00, 50000, 150, 88, 'running', NOW());

-- 6. INSERT DEFAULT PROMOTIONS
INSERT INTO promotions (promo_id, promo_name, promo_type, promo_code, bonus_percentage, max_bonus, min_deposit, wagering_requirement, valid_until, is_active) VALUES 
(1, '200% Welcome Bonus', 'welcome', 'WELCOME200', 200.00, 2500.00, 50.00, 5.00, DATE_ADD(NOW(), INTERVAL 1 YEAR), 1),
(2, 'Weekend Reload 100%', 'reload', 'WEEKEND100', 100.00, 500.00, 25.00, 5.00, DATE_ADD(NOW(), INTERVAL 6 MONTH), 1);

-- 7. SYSTEM CONFIGURATION SETTINGS
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES 
('site_name', 'PokerRoyale', 'string', 'Platform Title'),
('default_currency', 'USD', 'string', 'Primary Platform Currency'),
('min_deposit', '10', 'number', 'Minimum Deposit USD'),
('max_deposit', '50000', 'number', 'Maximum Deposit USD'),
('min_withdraw', '25', 'number', 'Minimum Withdrawal USD'),
('max_withdraw', '50000', 'number', 'Maximum Withdrawal USD'),
('default_rake_percent', '5.00', 'number', 'Default Table Rake'),
('maintenance_mode', 'false', 'boolean', 'Maintenance Flag');
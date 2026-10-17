-- ═══════════════════════════════════════════════════════
-- POKER ROYALE — COMPLETE UNIFIED DATABASE SCHEMA
-- Database Name: poker_royale_db
-- Engine: InnoDB | Charset: utf8mb4
-- ═══════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS poker_royale_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE poker_royale_db;

-- 1. USERS TABLE (Players + Admins + OTP)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT GENERATED ALWAYS AS (id) VIRTUAL, -- Alias for backward compatibility
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30) UNIQUE DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    date_of_birth DATE NOT NULL,
    country VARCHAR(50) DEFAULT 'United States',
    city VARCHAR(100) DEFAULT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    account_status ENUM('active', 'suspended', 'banned', 'pending', 'deleted') DEFAULT 'active',
    phone_verified TINYINT(1) DEFAULT 0,
    email_verified TINYINT(1) DEFAULT 1,
    is_admin TINYINT(1) DEFAULT 0,
    admin_role ENUM('super_admin', 'finance_admin', 'game_admin', 'support_admin', 'marketing_admin') DEFAULT NULL,
    otp_code VARCHAR(10) DEFAULT NULL,
    otp_expires DATETIME DEFAULT NULL,
    referral_code VARCHAR(20) UNIQUE DEFAULT NULL,
    referred_by INT DEFAULT NULL,
    total_games_played INT DEFAULT 0,
    total_hands_played INT DEFAULT 0,
    total_tournaments INT DEFAULT 0,
    tournaments_won INT DEFAULT 0,
    biggest_pot_won DECIMAL(15,2) DEFAULT 0.00,
    total_earned DECIMAL(15,2) DEFAULT 0.00,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    loyalty_points INT DEFAULT 0,
    vip_tier ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond') DEFAULT 'bronze',
    risk_score INT DEFAULT 0,
    last_login_at DATETIME DEFAULT NULL,
    last_login_ip VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. WALLETS TABLE
CREATE TABLE IF NOT EXISTS wallets (
    wallet_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    real_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    bonus_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    pending_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    locked_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_deposited DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_withdrawn DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_rake_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_bonus_earned DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id VARCHAR(100) PRIMARY KEY,
    user_id INT NOT NULL,
    wallet_id INT DEFAULT NULL,
    type ENUM('deposit', 'withdrawal', 'bonus', 'rake', 'tournament_buyin', 'tournament_win', 'cash_win', 'cash_loss', 'refund', 'adjustment') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) DEFAULT 0.00,
    balance_after DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed') DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'paypal',
    sender_account VARCHAR(255) DEFAULT NULL,
    receiver_account VARCHAR(255) DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    admin_notes TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    processed_by INT DEFAULT NULL,
    processed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. GAME TABLES
CREATE TABLE IF NOT EXISTS game_tables (
    table_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    game_type ENUM('texas_holdem', 'omaha', 'omaha_hilo', 'short_deck', 'seven_card_stud') DEFAULT 'texas_holdem',
    betting_type ENUM('no_limit', 'pot_limit', 'fixed_limit') DEFAULT 'no_limit',
    small_blind DECIMAL(10,2) NOT NULL,
    big_blind DECIMAL(10,2) NOT NULL,
    ante DECIMAL(10,2) DEFAULT 0.00,
    min_buyin DECIMAL(10,2) NOT NULL,
    max_buyin DECIMAL(10,2) NOT NULL,
    max_players INT DEFAULT 9,
    current_players INT DEFAULT 0,
    rake_percentage DECIMAL(5,2) DEFAULT 5.00,
    rake_cap DECIMAL(10,2) DEFAULT 50.00,
    status ENUM('waiting', 'active', 'paused', 'closed') DEFAULT 'waiting',
    total_hands INT DEFAULT 0,
    total_pot DECIMAL(15,2) DEFAULT 0.00,
    total_rake DECIMAL(15,2) DEFAULT 0.00,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. TABLE SEATS
CREATE TABLE IF NOT EXISTS table_seats (
    seat_id INT AUTO_INCREMENT PRIMARY KEY,
    table_id INT NOT NULL,
    user_id INT NOT NULL,
    seat_number INT NOT NULL,
    chips DECIMAL(15,2) NOT NULL,
    is_sitting_out TINYINT(1) DEFAULT 0,
    is_dealer TINYINT(1) DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at DATETIME DEFAULT NULL,
    FOREIGN KEY (table_id) REFERENCES game_tables(table_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. HANDS HISTORY
CREATE TABLE IF NOT EXISTS hands (
    hand_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    table_id INT NOT NULL,
    pot_total DECIMAL(15,2) DEFAULT 0.00,
    rake_taken DECIMAL(10,2) DEFAULT 0.00,
    winning_hand VARCHAR(100) DEFAULT NULL,
    winner_user_id INT DEFAULT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME DEFAULT NULL,
    FOREIGN KEY (table_id) REFERENCES game_tables(table_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. HAND ACTIONS
CREATE TABLE IF NOT EXISTS hand_actions (
    action_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hand_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    seat_number INT NOT NULL,
    street VARCHAR(20) DEFAULT 'preflop',
    action_type VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0.00,
    action_order INT DEFAULT 1,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 8. TOURNAMENTS
CREATE TABLE IF NOT EXISTS tournaments (
    tournament_id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_name VARCHAR(150) NOT NULL,
    description TEXT,
    game_type VARCHAR(50) DEFAULT 'texas_holdem',
    tournament_type VARCHAR(50) DEFAULT 'freezeout',
    buyin_amount DECIMAL(10,2) DEFAULT 0.00,
    entry_fee DECIMAL(10,2) DEFAULT 0.00,
    guaranteed_prize DECIMAL(15,2) DEFAULT 0.00,
    starting_chips INT DEFAULT 10000,
    max_players INT DEFAULT 1000,
    min_players INT DEFAULT 2,
    current_players INT DEFAULT 0,
    blind_structure TEXT,
    level_duration INT DEFAULT 600,
    start_time DATETIME NOT NULL,
    status ENUM('registration', 'running', 'paused', 'completed', 'cancelled') DEFAULT 'registration',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. TOURNAMENT REGISTRATIONS
CREATE TABLE IF NOT EXISTS tournament_registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    user_id INT NOT NULL,
    buyin_paid DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'registered',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. KYC VERIFICATIONS
CREATE TABLE IF NOT EXISTS kyc_verifications (
    kyc_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_url VARCHAR(500) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT DEFAULT NULL,
    verified_by INT DEFAULT NULL,
    verified_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. PROMOTIONS
CREATE TABLE IF NOT EXISTS promotions (
    promo_id INT AUTO_INCREMENT PRIMARY KEY,
    promo_name VARCHAR(150) NOT NULL,
    description TEXT,
    promo_type VARCHAR(50) NOT NULL,
    promo_code VARCHAR(50) DEFAULT NULL,
    bonus_percentage DECIMAL(5,2) DEFAULT 0.00,
    bonus_amount DECIMAL(10,2) DEFAULT 0.00,
    max_bonus DECIMAL(10,2) DEFAULT 0.00,
    min_deposit DECIMAL(10,2) DEFAULT 0.00,
    wagering_requirement DECIMAL(5,2) DEFAULT 0.00,
    valid_until DATETIME DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 12. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority ENUM('low', 'normal', 'high', 'critical') DEFAULT 'normal',
    status ENUM('open', 'progress', 'resolved', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 13. TICKET MESSAGES
CREATE TABLE IF NOT EXISTS ticket_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_type ENUM('user', 'admin') NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. LOGIN HISTORY
CREATE TABLE IF NOT EXISTS login_history (
    login_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    login_status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 15. AUDIT LOG (Admin Actions)
CREATE TABLE IF NOT EXISTS audit_log (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    new_values TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 16. FRAUD ALERTS
CREATE TABLE IF NOT EXISTS fraud_alerts (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    description TEXT NOT NULL,
    evidence TEXT DEFAULT NULL,
    status ENUM('new', 'investigating', 'confirmed', 'false_positive', 'resolved') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 17. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string',
    description VARCHAR(255) DEFAULT NULL,
    updated_by INT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
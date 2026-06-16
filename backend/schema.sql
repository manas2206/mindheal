-- ══════════════════════════════════════════════════════════════════════════════
-- Mental Wellness Counseling Platform — Database Schema
-- MySQL 8.x  |  Character set: utf8mb4  |  Collation: utf8mb4_unicode_ci
-- ══════════════════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS mental_wellness_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mental_wellness_db;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(150)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    phone           VARCHAR(20)     UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            ENUM('user','therapist','admin') NOT NULL DEFAULT 'user',
    gender          ENUM('male','female','other','prefer_not_to_say'),
    date_of_birth   DATE,
    profile_picture VARCHAR(500),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    otp_code        CHAR(6),
    otp_expires_at  DATETIME,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role  (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Therapist Profiles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS therapist_profiles (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED NOT NULL UNIQUE,
    license_number      VARCHAR(100) NOT NULL UNIQUE,
    specializations     JSON         NOT NULL,
    languages           JSON         NOT NULL,
    experience_years    INT UNSIGNED NOT NULL,
    education           TEXT,
    bio                 TEXT,
    session_fee         DECIMAL(10,2) NOT NULL,
    verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
    rating              DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
    total_reviews       INT UNSIGNED  NOT NULL DEFAULT 0,
    is_available        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_verification (verification_status),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Therapist Availability ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS therapist_availability (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    therapist_id INT UNSIGNED NOT NULL,
    day_of_week  TINYINT UNSIGNED NOT NULL COMMENT '0=Monday 6=Sunday',
    start_time   VARCHAR(5) NOT NULL COMMENT 'HH:MM',
    end_time     VARCHAR(5) NOT NULL COMMENT 'HH:MM',
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (therapist_id) REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    INDEX idx_therapist_day (therapist_id, day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Appointments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED NOT NULL,
    therapist_id  INT UNSIGNED NOT NULL,
    scheduled_at  DATETIME NOT NULL,
    duration_mins SMALLINT UNSIGNED NOT NULL DEFAULT 50,
    session_type  ENUM('video','chat','audio') NOT NULL DEFAULT 'video',
    status        ENUM('pending','confirmed','completed','cancelled','rescheduled') NOT NULL DEFAULT 'pending',
    meeting_link  VARCHAR(500),
    notes         TEXT,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (therapist_id) REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    INDEX idx_user_appointments      (user_id, status),
    INDEX idx_therapist_appointments (therapist_id, status),
    INDEX idx_scheduled_at           (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Subscriptions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    plan_name  VARCHAR(100) NOT NULL,
    price      DECIMAL(10,2) NOT NULL,
    sessions   SMALLINT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date   DATE NOT NULL,
    status     ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_subscription (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Payments ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED NOT NULL,
    appointment_id      INT UNSIGNED,
    subscription_id     INT UNSIGNED,
    amount              DECIMAL(10,2) NOT NULL,
    currency            CHAR(3) NOT NULL DEFAULT 'INR',
    razorpay_order_id   VARCHAR(200),
    razorpay_payment_id VARCHAR(200),
    razorpay_signature  VARCHAR(500),
    status              ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)         REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id)  REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    INDEX idx_user_payments   (user_id),
    INDEX idx_payment_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Mood Logs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mood_logs (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    mood_score TINYINT UNSIGNED NOT NULL COMMENT '1 (very low) to 10 (excellent)',
    mood_label VARCHAR(50),
    notes      TEXT,
    logged_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_mood (user_id, logged_at),
    CONSTRAINT chk_mood_score CHECK (mood_score BETWEEN 1 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sender_id      INT UNSIGNED NOT NULL,
    receiver_id    INT UNSIGNED NOT NULL,
    appointment_id INT UNSIGNED,
    content        TEXT NOT NULL,
    is_read        BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)      REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    INDEX idx_conversation (sender_id, receiver_id, sent_at),
    INDEX idx_unread       (receiver_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Reviews ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    therapist_id   INT UNSIGNED NOT NULL,
    user_id        INT UNSIGNED NOT NULL,
    appointment_id INT UNSIGNED,
    rating         TINYINT UNSIGNED NOT NULL,
    comment        TEXT,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (therapist_id)   REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)        REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    INDEX idx_therapist_reviews (therapist_id),
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
    UNIQUE KEY uq_user_appointment_review (user_id, appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Refresh Tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token_hash (token_hash),
    INDEX idx_user_tokens (user_id, revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Audit Logs (append-only, no FK cascade) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED,
    action     VARCHAR(100) NOT NULL,
    entity     VARCHAR(100),
    entity_id  INT UNSIGNED,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    metadata   JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_audit   (user_id, created_at),
    INDEX idx_action_audit (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Trigger: auto-update therapist rating after review insert ─────────────────
DELIMITER $$
CREATE TRIGGER update_therapist_rating
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    UPDATE therapist_profiles
    SET
        rating        = (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE therapist_id = NEW.therapist_id),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE therapist_id = NEW.therapist_id)
    WHERE id = NEW.therapist_id;
END$$
DELIMITER ;

SELECT 'Schema created successfully!' AS status;

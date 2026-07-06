<?php
/**
 * /api/v1/auth.php
 * Customer + admin authentication (register, login, profile, admin login)
 * Uses PDO, password_hash() (BCRYPT) and our pure-PHP JWT.
 */
require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../includes/rate_limit.php';

$action = input('action', $_GET['action'] ?? '');
$method = method();

if ($method === 'GET') {
    if ($action === 'me') {
        $c = require_customer();
        $cols = "id, name, email, phone, avatar_url, created_at";
        foreach (['wallet_balance','loyalty_points_total','referral_code','date_of_birth'] as $v3) {
            try { db()->query("SELECT `$v3` FROM customers LIMIT 0"); $cols .= ", $v3"; }
            catch (PDOException $ex) {}
        }
        $stmt = db()->prepare("SELECT $cols FROM customers WHERE id = ?");
        $stmt->execute([$c['id']]);
        json_response(['success' => true, 'customer' => $stmt->fetch()]);
    }
    json_response(['success' => false, 'message' => 'Invalid action'], 400);
}

if ($method === 'POST') {
    $action = input('action', '');
    switch ($action) {

        case 'register': {
            $name  = input('name', '');
            $email = input('email', '');
            $phone = input('phone', '');
            $pass  = input('password', '');
            if (!is_valid_email($email) || strlen($pass) < 6 || $name === '') {
                json_response(['success'=>false,'message'=>'Provide valid name, email and password (min 6 chars).'], 422);
            }
            $exists = db()->prepare("SELECT id FROM customers WHERE email = ?");
            $exists->execute([$email]);
            if ($exists->fetch()) {
                json_response(['success'=>false,'message'=>'Email already registered. Please log in.'], 409);
            }
            $hash = password_hash($pass, PASSWORD_BCRYPT);
            $stmt = db()->prepare(
                "INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)"
            );
            $stmt->execute([$name, $email, $phone, $hash]);
            $id = (int)db()->lastInsertId();
            $token = jwt_encode(['type' => 'customer', 'sub' => $id, 'email' => $email, 'name' => $name]);
            json_response(['success'=>true,'token'=>$token,'customer'=>['id'=>$id,'name'=>$name,'email'=>$email,'phone'=>$phone]], 201);
        }

        case 'login': {
            $email = input('email', '');
            $pass  = input('password', '');
            if (!is_valid_email($email) || $pass === '') {
                json_response(['success'=>false,'message'=>'Email and password required'], 422);
            }
            rate_limit_check($email);
            $stmt = db()->prepare("SELECT id, name, email, phone, avatar_url, password_hash, is_active FROM customers WHERE email = ?");
            $stmt->execute([$email]);
            $u = $stmt->fetch();
            if (!$u || !password_verify($pass, $u['password_hash']) || !$u['is_active']) {
                rate_limit_log($email, false);
                json_response(['success'=>false,'message'=>'Invalid email or password'], 401);
            }
            rate_limit_log($email, true);
            $token = jwt_encode(['type'=>'customer','sub'=>(int)$u['id'],'email'=>$u['email'],'name'=>$u['name']]);
            db()->prepare("UPDATE customers SET last_login_at = NOW() WHERE id = ?")->execute([$u['id']]);
            unset($u['password_hash'], $u['is_active']);
            json_response(['success'=>true,'token'=>$token,'customer'=>$u]);
        }

        case 'admin_login': {
            $email = input('email', '');
            $pass  = input('password', '');
            rate_limit_check($email);
            $stmt  = db()->prepare("SELECT id, name, email, role, password_hash, is_active FROM admin_users WHERE email = ?");
            $stmt->execute([$email]);
            $u = $stmt->fetch();
            if (!$u || !password_verify($pass, $u['password_hash']) || !$u['is_active']) {
                rate_limit_log($email, false);
                json_response(['success'=>false,'message'=>'Invalid admin credentials'], 401);
            }
            rate_limit_log($email, true);
            $token = jwt_encode(['type'=>'admin','sub'=>(int)$u['id'],'email'=>$u['email'],'name'=>$u['name'],'role'=>$u['role']]);
            db()->prepare("UPDATE admin_users SET last_login_at = NOW() WHERE id = ?")->execute([$u['id']]);
            json_response([
                'success' => true,
                'token'   => $token,
                'admin'   => [
                    'id'    => (int)$u['id'],
                    'name'  => $u['name'],
                    'email' => $u['email'],
                    'role'  => $u['role'],
                ],
            ]);
        }

        default:
            json_response(['success'=>false,'message'=>'Unknown action'], 400);
    }
}

if ($method === 'POST') {
    $action = input('action', '');

    // Forgot password — stores a reset token, emails it (or just returns it in dev mode)
    if ($action === 'forgot_password') {
        $email = strtolower(trim(input('email', '')));
        if (!$email) json_response(['success'=>false,'message'=>'Email required'], 422);
        try {
            $stmt = db()->prepare("SELECT id, name FROM customers WHERE email = ? AND is_active = 1");
            $stmt->execute([$email]);
            $cust = $stmt->fetch();
        } catch (PDOException $e) { $cust = null; }
        // Always return success (don't leak account existence)
        if ($cust) {
            $token   = bin2hex(random_bytes(20));
            $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
            try {
                db()->prepare("DELETE FROM password_reset_tokens WHERE email = ?")->execute([$email]);
                db()->prepare("INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?,?,?)")->execute([$email, $token, $expires]);
            } catch (PDOException $e) {
                // Table may not exist yet — surface token in dev mode only
                if (env('APP_DEBUG','0') === '1')
                    json_response(['success'=>true,'debug_token'=>$token,'message'=>'Reset token generated (debug mode — table missing)']);
            }
            // In production integrate your email service here (PHPMailer, Mailgun, etc.)
            if (env('APP_DEBUG','0') === '1')
                json_response(['success'=>true,'debug_token'=>$token,'expires_at'=>$expires]);
        }
        json_response(['success'=>true,'message'=>'If that email exists, a reset link has been sent.']);
    }

    if ($action === 'reset_password') {
        $token    = input('token', '');
        $password = input('password', '');
        if (!$token || strlen($password) < 6) json_response(['success'=>false,'message'=>'Token and new password (min 6 chars) required'], 422);
        try {
            $stmt = db()->prepare("SELECT email, expires_at FROM password_reset_tokens WHERE token = ?");
            $stmt->execute([$token]);
            $row = $stmt->fetch();
            if (!$row || strtotime($row['expires_at']) < time())
                json_response(['success'=>false,'message'=>'Reset link is invalid or has expired'], 400);
            db()->prepare("UPDATE customers SET password_hash = ? WHERE email = ?")->execute([password_hash($password, PASSWORD_BCRYPT), $row['email']]);
            db()->prepare("DELETE FROM password_reset_tokens WHERE token = ?")->execute([$token]);
            json_response(['success'=>true,'message'=>'Password updated successfully.']);
        } catch (PDOException $e) {
            json_response(['success'=>false,'message'=>'Could not reset password'], 500);
        }
    }
}

json_response(['success'=>false,'message'=>'Method not allowed'], 405);

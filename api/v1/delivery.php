<?php
/**
 * /api/v1/delivery.php  –  safe column handling for delivery_zones + coupons
 */
require_once __DIR__ . '/../bootstrap.php';

$method   = method();
$db       = db();
$resource = $_GET['resource'] ?? '';

function zcol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `delivery_zones` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}
function ccol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `coupons` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

function ensure_zone_columns(PDO $db): void {
    try {
        $db->exec("ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS city VARCHAR(80) NOT NULL DEFAULT 'Muzaffarnagar' AFTER pincode");
    } catch (PDOException $e) {}
}

function ensure_coupon_columns(PDO $db): void {
    try {
        $db->exec("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_public TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active");
        $db->exec("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS customer_id INT UNSIGNED NULL AFTER is_public");
        $db->exec("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS customer_email VARCHAR(120) NULL AFTER customer_id");
        $db->exec("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30) NULL AFTER customer_email");
    } catch (PDOException $e) {}
}

function resolve_registered_customer(PDO $db, array $params): ?array {
    $id = (int)($params['customer_id'] ?? 0);
    $email = trim((string)($params['customer_email'] ?? ''));
    $phone = trim((string)($params['customer_phone'] ?? ''));
    if ($id > 0) {
        $stmt = $db->prepare("SELECT id, name, email, phone FROM customers WHERE id = ? AND is_active = 1 LIMIT 1");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }
    if ($email !== '') {
        $stmt = $db->prepare("SELECT id, name, email, phone FROM customers WHERE email = ? AND is_active = 1 LIMIT 1");
        $stmt->execute([$email]);
        return $stmt->fetch() ?: null;
    }
    if ($phone !== '') {
        $stmt = $db->prepare("SELECT id, name, email, phone FROM customers WHERE phone = ? AND is_active = 1 LIMIT 1");
        $stmt->execute([$phone]);
        return $stmt->fetch() ?: null;
    }
    return null;
}

function coupon_matches_customer(PDO $db, array $coupon, ?array $customer): bool {
    if (empty($coupon['customer_id']) && empty($coupon['customer_email']) && empty($coupon['customer_phone'])) {
        return true;
    }
    if (!$customer) {
        return false;
    }
    if (!empty($coupon['customer_id']) && (int)$coupon['customer_id'] === (int)$customer['id']) return true;
    if (!empty($coupon['customer_email']) && strtolower((string)$coupon['customer_email']) === strtolower((string)$customer['email'])) return true;
    if (!empty($coupon['customer_phone']) && (string)$coupon['customer_phone'] === (string)$customer['phone']) return true;
    return false;
}

ensure_zone_columns($db);
ensure_coupon_columns($db);

switch ($resource) {

    /* ── DELIVERY ZONES ──────────────────────────────────────── */
    case 'zones': {
        switch ($method) {
            case 'GET': {
                $id = (int)($_GET['id'] ?? 0);
                if ($id) {
                    $stmt = $db->prepare("SELECT * FROM delivery_zones WHERE id = ?");
                    $stmt->execute([$id]);
                    $row = $stmt->fetch();
                    if (!$row) json_response(['success'=>false,'message'=>'Zone not found'], 404);
                    json_response(['success'=>true,'zone'=>$row]);
                }
                $pincode = $_GET['pincode'] ?? '';
                if ($pincode) {
                    $cond = zcol($db,'is_active') ? " AND is_active = 1" : "";
                    $stmt = $db->prepare("SELECT * FROM delivery_zones WHERE pincode = ?$cond LIMIT 1");
                    $stmt->execute([$pincode]);
                    $row = $stmt->fetch();
                    if (!$row) json_response([
                        'success'=>false,'message'=>'Pincode not in custom zones; using global defaults.',
                        'fallback_delivery_charge'=>(float)setting('default_delivery_charge','40.00'),
                        'free_delivery_threshold' =>(float)setting('free_delivery_threshold','499.00'),
                    ]);
                    json_response(['success'=>true,'zone'=>$row]);
                }
                $admin = current_admin();
                $where = '';
                if (!$admin && zcol($db,'is_active')) {
                    $where = ' WHERE is_active = 1';
                }
                $order = zcol($db,'name') ? "ORDER BY name ASC" : "ORDER BY id ASC";
                try {
                    $rows = $db->query("SELECT * FROM delivery_zones $where $order")->fetchAll();
                } catch (PDOException $e) { $rows = []; }
                json_response(['success'=>true,'zones'=>$rows]);
            }
            case 'POST': {
                require_admin();
                $name = input('name',''); $pincode = input('pincode',''); $city = input('city','Muzaffarnagar');
                if (!$name || !$pincode) json_response(['success'=>false,'message'=>'name and pincode required'],422);
                $cols=['name','pincode','city']; $vals=[$name,$pincode,$city]; $marks=['?','?','?'];
                $opts=['delivery_charge'=>(float)input('delivery_charge',0),'min_order_value'=>(float)input('min_order_value',0),
                       'estimated_minutes'=>(int)input('estimated_minutes',30),'is_active'=>input('is_active',1)?1:0];
                foreach($opts as $col=>$val) if(zcol($db,$col)){$cols[]=$col;$vals[]=$val;$marks[]='?';}
                try { $db->exec("ALTER TABLE delivery_zones DROP INDEX uq_zone_pincode"); } catch (PDOException $e) {}
                $db->prepare("INSERT INTO delivery_zones (".implode(',',$cols).") VALUES (".implode(',',$marks).")")->execute($vals);
                json_response(['success'=>true,'id'=>(int)$db->lastInsertId()],201);
            }
            case 'PUT': {
                require_admin();
                $id=(int)input('id',0); if(!$id) json_response(['success'=>false,'message'=>'ID required'],422);
                $set=[]; $vals=[];
                foreach(['name','pincode','city'] as $f){$v=input($f);if($v!==null){$set[]="$f=?";$vals[]=$v;}}
                $opts=['delivery_charge','min_order_value','estimated_minutes'];
                foreach($opts as $col) if(zcol($db,$col)){$v=input($col);if($v!==null){$set[]="$col=?";$vals[]=(float)$v;}}
                if(zcol($db,'is_active')){$v=input('is_active');if($v!==null){$set[]="is_active=?";$vals[]=$v?1:0;}}
                if(!$set) json_response(['success'=>true]);
                $vals[]=$id;
                $db->prepare("UPDATE delivery_zones SET ".implode(',',$set)." WHERE id=?")->execute($vals);
                json_response(['success'=>true]);
            }
            case 'DELETE': {
                require_admin(); $id=(int)input('id',0); if(!$id) json_response(['success'=>false,'message'=>'ID required'],422);
                $db->prepare("DELETE FROM delivery_zones WHERE id=?")->execute([$id]);
                json_response(['success'=>true]);
            }
            default: json_response(['success'=>false,'message'=>'Method not allowed'],405);
        }
        break;
    }

    /* ── COUPONS ─────────────────────────────────────────────── */
    case 'coupons': {
        switch ($method) {
            case 'GET': {
                $code = $_GET['code'] ?? '';
                if ($code) {
                    $cond = ccol($db,'is_active') ? " AND is_active = 1" : "";
                    $stmt = $db->prepare("SELECT * FROM coupons WHERE code = ?$cond LIMIT 1");
                    $stmt->execute([$code]);
                    $c = $stmt->fetch();
                    if (!$c) json_response(['success'=>false,'message'=>'Coupon not found or inactive'],404);
                    $now = time();
                    if ((ccol($db,'expires_at') && $c['expires_at'] && strtotime($c['expires_at']) < $now) ||
                        (ccol($db,'starts_at')  && $c['starts_at']  && strtotime($c['starts_at'])  > $now) ||
                        (ccol($db,'usage_limit') && $c['usage_limit'] > 0 && (ccol($db,'used_count') && $c['used_count'] >= $c['usage_limit'])))
                        json_response(['success'=>false,'message'=>'Coupon expired or exhausted'],410);
                    $customer = resolve_registered_customer($db, [
                        'customer_id' => $_GET['customer_id'] ?? 0,
                        'customer_email' => $_GET['customer_email'] ?? '',
                        'customer_phone' => $_GET['customer_phone'] ?? '',
                    ]);
                    if (!coupon_matches_customer($db, $c, $customer)) {
                        json_response(['success'=>false,'message'=>'This coupon is not valid for your account'],403);
                    }
                    json_response(['success'=>true,'coupon'=>$c]);
                }
                $publicOnly = ($_GET['public'] ?? '0') === '1';
                if ($publicOnly) {
                    $customer = resolve_registered_customer($db, [
                        'customer_id' => $_GET['customer_id'] ?? 0,
                        'customer_email' => $_GET['customer_email'] ?? '',
                        'customer_phone' => $_GET['customer_phone'] ?? '',
                    ]);
                    $rows = [];
                    try {
                        $rows = $db->query("SELECT * FROM coupons WHERE is_active = 1 AND (is_public = 1 OR is_public IS NULL) ORDER BY id DESC")->fetchAll();
                    } catch (PDOException $e) { $rows = []; }
                    if ($customer) {
                        try {
                            $stmt = $db->prepare("SELECT * FROM coupons WHERE is_active = 1 ORDER BY id DESC");
                            $stmt->execute();
                            $all = $stmt->fetchAll();
                            $rows = array_values(array_filter($all, function ($coupon) use ($db, $customer) {
                                return coupon_matches_customer($db, $coupon, $customer) || (empty($coupon['customer_id']) && empty($coupon['customer_email']) && empty($coupon['customer_phone']));
                            }));
                        } catch (PDOException $e) {}
                    }
                    json_response(['success'=>true,'coupons'=>$rows]);
                }
                require_admin();
                try {
                    $rows = $db->query("SELECT * FROM coupons ORDER BY id DESC")->fetchAll();
                } catch (PDOException $e) { $rows = []; }
                json_response(['success'=>true,'coupons'=>$rows]);
            }
            case 'POST': {
                require_admin();
                $code = strtoupper(input('code',''));
                if (!$code) json_response(['success'=>false,'message'=>'code required'],422);
                $cols=['code']; $vals=[$code]; $marks=['?'];
                $opts=['description'=>input('description',''),'discount_type'=>input('discount_type','flat'),
                       'discount_value'=>(float)input('discount_value',0),'min_order_value'=>(float)input('min_order_value',0),
                       'max_discount'=>input('max_discount')!==null?(float)input('max_discount'):null,
                       'usage_limit'=>(int)input('usage_limit',0),'starts_at'=>input('starts_at')?:null,
                       'expires_at'=>input('expires_at')?:null,'is_active'=>input('is_active',1)?1:0,
                       'is_public'=>input('is_public',1)?1:0,'customer_id'=>input('customer_id') ?: null,
                       'customer_email'=>input('customer_email') ?: null,'customer_phone'=>input('customer_phone') ?: null];
                foreach($opts as $col=>$val) if(ccol($db,$col)){$cols[]=$col;$vals[]=$val;$marks[]='?';}
                $db->prepare("INSERT INTO coupons (".implode(',',$cols).") VALUES (".implode(',',$marks).")")->execute($vals);
                json_response(['success'=>true,'id'=>(int)$db->lastInsertId()],201);
            }
            case 'PUT': {
                require_admin();
                $id=(int)input('id',0); if(!$id) json_response(['success'=>false,'message'=>'ID required'],422);
                $set=[]; $vals=[];
                $updatable=['code','description','starts_at','expires_at'];
                foreach($updatable as $f){$v=input($f);if($v!==null&&ccol($db,$f)){$set[]="$f=?";$vals[]=$v;}}
                $nums=['discount_value','min_order_value','max_discount','usage_limit'];
                foreach($nums as $f){$v=input($f);if($v!==null&&ccol($db,$f)){$set[]="$f=?";$vals[]=(float)$v;}}
                if(ccol($db,'discount_type')){$v=input('discount_type');if($v){$set[]="discount_type=?";$vals[]=$v;}}
                if(ccol($db,'is_active')){$v=input('is_active');if($v!==null){$set[]="is_active=?";$vals[]=$v?1:0;}}
                foreach(['is_public','customer_id','customer_email','customer_phone'] as $f){$v=input($f); if($v!==null&&ccol($db,$f)){$set[]="$f=?";$vals[]=$v;}}
                if(!$set) json_response(['success'=>true]);
                $vals[]=$id;
                $db->prepare("UPDATE coupons SET ".implode(',',$set)." WHERE id=?")->execute($vals);
                json_response(['success'=>true]);
            }
            case 'DELETE': {
                require_admin(); $id=(int)input('id',0); if(!$id) json_response(['success'=>false,'message'=>'ID required'],422);
                $db->prepare("DELETE FROM coupons WHERE id=?")->execute([$id]);
                json_response(['success'=>true]);
            }
            default: json_response(['success'=>false,'message'=>'Method not allowed'],405);
        }
        break;
    }

    default:
        json_response(['success'=>false,'message'=>'Use ?resource=zones or ?resource=coupons'],400);
}

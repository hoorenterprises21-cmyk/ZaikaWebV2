<?php
/**
 * /api/v1/payments.php  –  safe column handling
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function paycol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `payments` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

function payment_methods(): array {
    return [
        ['key'=>'cod',       'label'=>'Cash on Delivery',    'enabled'=>setting('enable_cod','1')==='1',
         'description'=>'Pay with cash when your order arrives.'],
        ['key'=>'upi',       'label'=>'UPI',                  'enabled'=>setting('enable_upi','1')==='1',
         'upi_id'=>setting('upi_id',''), 'payee_name'=>setting('upi_payee_name',setting('restaurant_name','Zaika Lounge')),
         'description'=>'Pay directly via any UPI app.'],
        ['key'=>'razorpay',  'label'=>'Razorpay',             'enabled'=>setting('enable_razorpay','0')==='1',
         'key_id'=>setting('razorpay_key_id',''), 'description'=>'Pay via Razorpay (cards, UPI, netbanking).'],
        ['key'=>'stripe',    'label'=>'Stripe',               'enabled'=>setting('enable_stripe','0')==='1',
         'publishable_key'=>setting('stripe_publishable_key',''), 'description'=>'International card payments via Stripe.'],
        ['key'=>'whatsapp',  'label'=>'Order via WhatsApp',   'enabled'=>setting('enable_whatsapp_order','1')==='1',
         'description'=>'Send your order as a WhatsApp message.'],
    ];
}

switch ($method) {

    case 'GET': {
        if (($_GET['action'] ?? '') === 'methods')
            json_response(['success'=>true,'methods'=>payment_methods()]);
        require_admin();

        $page    = max(1,(int)($_GET['page']??1));
        $perPage = min(100,max(1,(int)($_GET['per_page']??20)));
        $offset  = ($page-1)*$perPage;

        try {
            $total = (int)$db->query("SELECT COUNT(*) FROM payments")->fetchColumn();
            $rows  = $db->query("SELECT p.*, o.order_number
                                 FROM payments p
                                 LEFT JOIN orders o ON o.id = p.order_id
                                 ORDER BY p.id DESC LIMIT $offset,$perPage")->fetchAll();
        } catch (PDOException $e) { $total = 0; $rows = []; }

        json_response(['success'=>true,'data'=>$rows,
            'pagination'=>['page'=>$page,'per_page'=>$perPage,'total'=>$total,'total_pages'=>(int)ceil($total/$perPage)]]);
    }

    case 'POST': {
        $cust      = require_customer();
        $orderId   = (int)input('order_id', 0);
        $txnId     = input('transaction_id', '');
        $status    = input('status', '');
        $gateway   = input('gateway', '');
        $response  = input('gateway_response', '');

        $ostmt = $db->prepare("SELECT * FROM orders WHERE id = ? AND customer_id = ?");
        $ostmt->execute([$orderId, $cust['id']]);
        $order = $ostmt->fetch();
        if (!$order) json_response(['success'=>false,'message'=>'Order not found'], 404);

        $newStatus     = in_array($status,['success','paid'],true) ? 'success' : (in_array($status,['failed','error'],true) ? 'failed' : 'pending');
        $orderPayStatus = $newStatus === 'success' ? 'paid' : ($newStatus === 'failed' ? 'failed' : 'pending');
        $orderStatus    = $newStatus === 'success' ? 'confirmed' : $order['order_status'];

        // Insert payment row
        try {
            $cols  = ['order_id','customer_id','payment_method','amount','status'];
            $vals  = [$orderId,$cust['id'],$order['payment_method'],$order['total_amount'],$newStatus];
            $marks = ['?','?','?','?','?'];
            if (paycol($db,'gateway'))          { $cols[]='gateway';          $vals[]=$gateway?:$order['payment_method']; $marks[]='?'; }
            if (paycol($db,'transaction_id'))   { $cols[]='transaction_id';   $vals[]=$txnId;   $marks[]='?'; }
            if (paycol($db,'currency'))         { $cols[]='currency';         $vals[]=setting('currency_code','INR'); $marks[]='?'; }
            if (paycol($db,'gateway_response')) { $cols[]='gateway_response'; $vals[]=$response?:null; $marks[]='?'; }
            $db->prepare("INSERT INTO payments (".implode(',',$cols).") VALUES (".implode(',',$marks).")")->execute($vals);
        } catch (PDOException $e) {}

        // Update order
        $oSet = ["payment_status = ?"];
        $oVal = [$orderPayStatus];
        if (ocol($db, 'orders', 'transaction_id') && $txnId) { $oSet[] = "transaction_id = ?"; $oVal[] = $txnId; }
        $oSet[] = "order_status = ?"; $oVal[] = $orderStatus;
        $oVal[] = $orderId;
        try {
            $db->prepare("UPDATE orders SET ".implode(',',$oSet)." WHERE id = ?")->execute($oVal);
        } catch (PDOException $e) {}

        json_response(['success'=>true,'status'=>$newStatus,'order_status'=>$orderStatus], 201);
    }

    default:
        json_response(['success'=>false,'message'=>'Method not allowed'], 405);
}

/** Reuse ocol from orders.php context if available, else define locally */
if (!function_exists('ocol')) {
    function ocol(PDO $db, string $table, string $col): bool {
        static $c = [];
        $k = "$table.$col";
        if (!isset($c[$k])) {
            try { $db->query("SELECT `$col` FROM `$table` LIMIT 0"); $c[$k] = true; }
            catch (PDOException $e) { $c[$k] = false; }
        }
        return $c[$k];
    }
}

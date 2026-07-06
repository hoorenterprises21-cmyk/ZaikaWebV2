<?php
/**
 * /api/v1/calendar.php — Calendar events CRUD
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function cacol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `admin_calendar_events` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        require_admin();
        $id = (int)($_GET['id'] ?? 0);
        $month = $_GET['month'] ?? date('Y-m'); // YYYY-MM

        if ($id) {
            $stmt = $db->prepare("SELECT * FROM admin_calendar_events WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) json_response(['success' => false, 'message' => 'Event not found'], 404);
            json_response(['success' => true, 'event' => $row]);
        }

        $stmt = $db->prepare("SELECT * FROM admin_calendar_events WHERE DATE_FORMAT(event_date, '%Y-%m') = ? AND is_active = 1 ORDER BY event_date ASC");
        $stmt->execute([$month]);
        json_response(['success' => true, 'events' => $stmt->fetchAll()]);
    }

    case 'POST': {
        require_admin();
        $title = input('title', '');
        $eventDate = input('event_date', '');
        $eventType = input('event_type', 'other');

        if (!$title || !$eventDate) {
            json_response(['success' => false, 'message' => 'title and event_date required'], 422);
        }

        $db->prepare("INSERT INTO admin_calendar_events (title, description, event_date, event_type) VALUES (?,?,?,?)")
           ->execute([$title, input('description', ''), $eventDate, $eventType]);
        json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    case 'PUT':
    case 'PATCH': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);

        $set = []; $vals = [];
        $fields = ['title','description','event_date','event_type','is_active'];
        foreach ($fields as $f) {
            $v = input($f);
            if ($v !== null && cacol($db, $f)) { $set[] = "$f = ?"; $vals[] = $v; }
        }
        if (!$set) json_response(['success' => true]);
        $vals[] = $id;
        $db->prepare("UPDATE admin_calendar_events SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success' => true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);
        $db->prepare("DELETE FROM admin_calendar_events WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}

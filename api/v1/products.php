        $updatable = [
            'description'  => input('description'),
            'ingredients'  => input('ingredients'),
            'image_url'    => input('image_url'),
            'stock_status' => input('stock_status'),
        ];
        foreach ($updatable as $col => $val) {
            if (pcol($db, $col) && $val !== null) { $set[] = "$col = ?"; $vals[] = $val; }
        }

        if (pcol($db, 'discount_price')) {
            $d = input('discount_price');
            $dv = ($d === '' || $d === null) ? null : (float)$d;
            $set[] = 'discount_price = ?'; $vals[] = $dv;
        }
        foreach ([
            'is_veg'=>'is_veg','is_featured'=>'is_featured','is_best_seller'=>'is_best_seller','is_combo'=>'is_combo', 'is_active'=>'is_active',
        ] as $col => $_) {
            if (pcol($db, $col)) {
                $v = input($col) !== null ? (input($col) ? 1 : 0) : (int)($existing[$col] ?? 0);
                $set[] = "$col = ?"; $vals[] = $v;
            }
        }
        if (pcol($db, 'preparation_time')) {
            $set[] = 'preparation_time = ?';
            $vals[] = input('preparation_time') !== null ? (int)input('preparation_time') : (int)($existing['preparation_time'] ?? 20);
        }
        if (pcol($db, 'rating')) {
            $set[] = 'rating = ?';
            $vals[] = input('rating') !== null ? (float)input('rating') : (float)($existing['rating'] ?? 4.0);
        }
        if (pcol($db, 'sort_order')) {
            $set[] = 'sort_order = ?';
            $vals[] = input('sort_order') !== null ? (int)input('sort_order') : (int)($existing['sort_order'] ?? 0);
        }
        if (pcol($db, 'combo_items')) {
            $ci = input('combo_items');
            $set[] = 'combo_items = ?';
            $vals[] = $ci !== null ? $ci : ($existing['combo_items'] ?? null);
        }
        if (pcol($db, 'combo_discount_percent')) {
            $set[] = 'combo_discount_percent = ?';
            $vals[] = input('combo_discount_percent') !== null ? (float)input('combo_discount_percent') : (float)($existing['combo_discount_percent'] ?? 0);
        }

        $vals[] = $id;
        $db->prepare("UPDATE products SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success'=>true]);
    }
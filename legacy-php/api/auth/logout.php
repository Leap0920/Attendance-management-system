<?php
/**
 * Logout Handler
 */
require_once '../../config/session.php';
require_once '../../config/database.php';
require_once '../../includes/functions.php';

if (Session::isLoggedIn()) {
    try {
        $db = getDB();
        logAudit($db, Session::getUserId(), 'logout', 'user', Session::getUserId());
    } catch (Exception $e) {
    }
}

Session::destroy();
header('Location: ../../index.php');
exit;
?>
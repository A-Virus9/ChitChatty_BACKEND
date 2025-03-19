const express = require('express');
const userControllers = require('../controllers/userControllers.js');

const router = express.Router();

router.post('/login', userControllers.loginUser);
router.post('/signup', userControllers.createUser);
router.post("/checker", userControllers.checker);
router.post("/isonline", userControllers.protect, userControllers.isOnline);

module.exports = router;
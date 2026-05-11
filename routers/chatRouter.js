const express = require('express');
const chatControllers = require('../controllers/chatControllers.js');
const userControllers = require('../controllers/userControllers.js');

const router = express.Router();

router.get('/getMessages', userControllers.protect, chatControllers.getMessages)

module.exports = router;
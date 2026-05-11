const express = require('express');
const conversationControllers = require('../controllers/conversationControllers.js');
const userControllers = require('../controllers/userControllers.js');

const router = express.Router();

router.get('/getConversations', userControllers.protect, conversationControllers.getConversations);
router.post('/add', userControllers.protect, conversationControllers.addChat);

module.exports = router;
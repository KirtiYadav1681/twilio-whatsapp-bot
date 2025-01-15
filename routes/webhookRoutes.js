const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.post('/webhook', messageController.handleWebhook);
router.get('/', (req, res) => res.status(200).send('Server is running!'));

module.exports = router;
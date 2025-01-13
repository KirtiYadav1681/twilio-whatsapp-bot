const twilioService = require('../services/twilioService');
const schedulerService = require('../services/schedulerService');
const templates = require('../constants/messageTemplates');

const handleWebhook = async (req, res) => {
    try {
        const incomingMsg = req?.body?.Body;
        const senderNumber = req?.body?.From;

        if (!incomingMsg || !senderNumber) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Missing required fields' 
            });
        }

        if (incomingMsg.toLowerCase().includes('schedule')) {
            
            await twilioService.sendMessage(
                senderNumber,
                templates.scheduledConfirmation
            );
            await schedulerService.scheduleMessage(
                'This is a scheduled message that comes 1 minute after you send \'schedule\' message'
            );
        } else {
            await twilioService.handleIncomingMessage(incomingMsg, senderNumber);
        }

        return res.status(200).json({ 
            status: 'success', 
            message: 'Response sent' 
        });
    } catch (error) {
        console.error('Error in handleWebhook:', error);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error processing message',
            error: error.message 
        });
    }
};

module.exports = {
    handleWebhook,
};

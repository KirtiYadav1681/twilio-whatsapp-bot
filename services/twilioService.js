const twilio = require('twilio');
const config = require('../config/twilio.config');
const templates = require('../constants/messageTemplates');

const initializeTwilioClient = () => {
    try {
        return twilio(config.accountSid, config.authToken);
    } catch (error) {
        console.error('Error initializing Twilio client:', error);
        throw new Error('Failed to initialize Twilio client');
    }
};

const client = initializeTwilioClient();
const validateMessageParams = (to, body) => {
    const errors = [];

    if (!to) errors.push('Recipient number is required');
    if (!body) errors.push('Message body is required');
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

const sendMessage = async (to, body) => {
    const validation = validateMessageParams(to, body);
    
    if (!validation.isValid) {
        throw new Error(`Invalid message parameters: ${validation.errors.join(', ')}`);
    }

    try {
        return await client.messages.create({
            from: config.fromNumber,
            to,
            body
        });
    } catch (error) {
        console.error('Error sending message:', error);
        throw new Error(`Failed to send message: ${error.message}`);
    }
};

const handleWelcomeMessage = async (senderNumber) => {
    return sendMessage(senderNumber, templates.welcome);
};

const handleWebDevelopment = async (senderNumber) => {
    return sendMessage(senderNumber, templates.webDevelopment);
};

const handleMobileDevelopment = async (senderNumber) => {
    return sendMessage(senderNumber, templates.mobileDevelopment);
};

const handleDefaultResponse = async (senderNumber) => {
    return sendMessage(senderNumber, templates.defaultResponse);
};

const handleIncomingMessage = async (incomingMsg, senderNumber) => {
    if (!incomingMsg || !senderNumber) {
        throw new Error('Missing required parameters: message or sender number');
    }

    try {
        const msg = incomingMsg.toLowerCase();
        // Using object literal for message type mapping
        const messageHandlers = {
            'greeting': () => msg.includes('hello') || msg.includes('hi'),
            '1': () => msg === '1',
            '2': () => msg === '2'
        };

        if (messageHandlers.greeting()) {
            return handleWelcomeMessage(senderNumber);
        }
        
        if (messageHandlers['1']()) {
            return handleWebDevelopment(senderNumber);
        }
        
        if (messageHandlers['2']()) {
            return handleMobileDevelopment(senderNumber);
        }

        return handleDefaultResponse(senderNumber);
    } catch (error) {
        console.error('Error handling incoming message:', error);
        throw error;
    }
};
const checkClientStatus = () => {
    try {
        if (!client) {
            throw new Error('Twilio client not initialized');
        }
        return { status: 'ready', accountSid: config.accountSid };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
};

const formatPhoneNumber = (number) => {
    if (!number.startsWith('whatsapp:')) {
        return `whatsapp:${number}`;
    }
    return number;
};

module.exports = {
    sendMessage,
    handleIncomingMessage,
    checkClientStatus,
    formatPhoneNumber,
    validateMessageParams,
    handlers: {
        handleWelcomeMessage,
        handleWebDevelopment,
        handleMobileDevelopment,
        handleDefaultResponse
    }
};
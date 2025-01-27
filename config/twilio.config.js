const twilioConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: 'whatsapp:+918962230921',
    recipientNumbers:['whatsapp:+916266558859',]
};

module.exports = twilioConfig;
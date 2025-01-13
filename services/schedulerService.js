const cron = require('node-cron');
const twilioService = require('./twilioService');
const config = require('../config/twilio.config');

const calculateCronExpression = (delayMinutes) => {
    const scheduledTime = new Date(Date.now() + delayMinutes * 60000);
    
    return {
        cronExpression: `${scheduledTime.getMinutes()} ${scheduledTime.getHours()} ${scheduledTime.getDate()} ${scheduledTime.getMonth() + 1} *`,
        scheduledTime
    };
};

const sendMessagesToRecipients = async (senderNumber, message) => {
    const messagePromises = senderNumber.map(recipientNumber => 
        twilioService.sendMessage(recipientNumber, message)
    );

    return Promise.all(messagePromises);
};

const scheduleMessage = async (senderNumber,message, delayMinutes = 1) => {
    if (!message) {
        throw new Error('Message is required');
    }

    if (delayMinutes < 1) {
        throw new Error('Delay must be at least 1 minute');
    }

    try {
        const { cronExpression, scheduledTime } = calculateCronExpression(delayMinutes);

        const job = cron.schedule(cronExpression, async () => {
            try {
                await sendMessagesToRecipients(senderNumber,message);
            } catch (error) {
                console.error('Error sending scheduled messages:', error);
                throw error;
            }
        });

        return {
            status: 'scheduled',
            scheduledTime,
            cronExpression
        };
    } catch (error) {
        console.error('Error scheduling messages:', error);
        throw error;
    }
};

module.exports = {
    scheduleMessage,
    calculateCronExpression
};

// async function scheduleMessagesForRecipients() {
//   const sendDate = new Date(Date.now() + 60000);

//   try {
//     const messagePromises = recipientNumbers.map((recipientNumber) => {
//       return client.messages.create({
//         from: "whatsapp:+14155238886",
//         to: recipientNumber,
//         body: "Your scheduled message",
//         scheduledType: "fixed",
//         sendAt: sendDate.toISOString(),
//       });
//     });

//     const results = await Promise.all(messagePromises);
//     results.forEach((message, index) => {
//       console.log(
//         `Scheduled message for ${recipientNumbers[index]}, Message SID: ${message.sid}`
//       );
//     });
//   } catch (error) {
//     console.error("Error scheduling messages:", error);
//   }
// }
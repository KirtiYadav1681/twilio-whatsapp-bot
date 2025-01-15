const twilio = require("twilio");
const config = require("../config/twilio.config");
const templates = require("../constants/messageTemplates");

const userStates = new Map();

const initializeTwilioClient = () => {
  try {
    return twilio(config.accountSid, config.authToken);
  } catch (error) {
    console.error("Error initializing Twilio client:", error);
    throw new Error("Failed to initialize Twilio client");
  }
};

const client = initializeTwilioClient();

const validateMessageParams = (params) => {
  const errors = [];
  if (!params.to) errors.push("Recipient number is required");
  if (!params.sid && !params.body)
    errors.push("Either message body or template SID is required");

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const sendMessage = async ({ to, body, sid }) => {
  const validation = validateMessageParams({ to, body, sid });
  if (!validation.isValid) {
    throw new Error(
      `Invalid message parameters: ${validation.errors.join(", ")}`
    );
  }

  try {
    const messageParams = {
      from: config.fromNumber,
      to: to,
    };

    if (sid) {
      messageParams.contentSid = sid;
    } else {
      messageParams.body = body;
    }

    return await client.messages.create(messageParams);
  } catch (error) {
    console.error("Error sending message:", error);
    throw new Error(`Failed to send message: ${error.message}`);
  }
};

const handleWelcomeMessage = async (senderNumber) => {
  userStates.set(senderNumber, { stage: "awaiting_service_selection" });

  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_SERVICE_TEMPLATE_ID,
  });
};

const handleLocationRequest = async (senderNumber, selectedService) => {
  return sendMessage({
    to: senderNumber,
    body: "Please share your location so we can find the nearest service provider.",
  });
};

const handlePlumbingService = async (senderNumber, location) => {
  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_PLUMBING_SERVICE_TEMPLATE_ID,
  });
};

const handleElectricService = async (senderNumber, location) => {
  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_ELECTRIC_SERVICE_TEMPLATE_ID,
  });
};

const handleDefaultResponse = async (senderNumber) => {
  return sendMessage({
    to: senderNumber,
    body: templates.defaultResponse,
  });
};

const handleIncomingMessage = async (req, incomingMsg, senderNumber) => {
  try {
    const msg = incomingMsg.toLowerCase();
    const userState = userStates.get(senderNumber) || { stage: "new" };
    if (msg.includes("hello") || msg.includes("hi")) {
      return handleWelcomeMessage(senderNumber);
    }

    if (req.body.ListId && userState.stage === "awaiting_service_selection") {
      userState.selectedService = req.body.ListId;
      userState.stage = "awaiting_location";
      userStates.set(senderNumber, userState);
      return handleLocationRequest(senderNumber, req.body.ListId);
    }

    if (
      req.body.Latitude &&
      req.body.Longitude &&
      userState.stage === "awaiting_location"
    ) {
      const location = {
        latitude: req.body.Latitude,
        longitude: req.body.Longitude,
      };

      userStates.delete(senderNumber);

      switch (userState.selectedService) {
        case "plumbing":
          return handlePlumbingService(senderNumber, location);
        case "electric":
          return handleElectricService(senderNumber, location);
        default:
          return handleDefaultResponse(senderNumber);
      }
    }

    if (userState.stage === "awaiting_location") {
      return sendMessage({
        to: senderNumber,
        body: "Please share your location to proceed with the service request.",
      });
    }

    return handleDefaultResponse(senderNumber);
  } catch (error) {
    console.error("Error handling incoming message:", error);
    throw error;
  }
};
const checkClientStatus = () => {
  try {
    if (!client) {
      throw new Error("Twilio client not initialized");
    }
    return { status: "ready", accountSid: config.accountSid };
  } catch (error) {
    return { status: "error", message: error.message };
  }
};

const formatPhoneNumber = (number) => {
  if (!number.startsWith("whatsapp:")) {
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
    handlePlumbingService,
    handleElectricService,
    handleDefaultResponse,
  },
};

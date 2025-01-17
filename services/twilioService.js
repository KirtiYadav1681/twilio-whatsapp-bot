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

const sendMessage = async ({ to, body, sid, variables }) => {
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
      if (variables) {
        messageParams.contentVariables = JSON.stringify(variables);
      }
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
    variables: {
      1: senderNumber.split(":")[1],
    },
  });
};

const handleLocationRequest = async (senderNumber, selectedService) => {
  return sendMessage({
    to: senderNumber,
    body: "Please share your location so we can find the nearest service provider.",
  });
};
const handlePlumbingService = async (senderNumber, location) => {
  userStates.set(senderNumber, {
    stage: "awaiting_plumber_selection",
    selectedService: "plumbing",
    location,
  });

  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_PLUMBING_SERVICE_TEMPLATE_ID,
  });
};

const handlePlumberSelection = async (senderNumber, plumberId) => {
  const userState = userStates.get(senderNumber);
  userState.selectedPlumber = plumberId;
  userState.stage = "awaiting_form_submission";
  userStates.set(senderNumber, userState);
  const formUrl = `${process.env.SERVER_URL}/form?number=${encodeURIComponent(
    senderNumber
  )}`;

  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_FORM_TEMPLATE_ID,
    variables: {
      1: formUrl,
    },
  });
};

const availableSlots = ["10:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"];

const handleFormSubmission = async (senderNumber, formData) => {
  const userState = userStates.get(senderNumber)
  // if (userState) {
  userState.stage = "awaiting_slot_selection";
  userState.formData = formData;
  userStates.set(senderNumber, userState);

  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_SLOTS_TEMPLATE_ID,
    variables: {
      date: formData.preferredDate,
      1: availableSlots[0],
      2: availableSlots[1],
      3: availableSlots[2],
      4: availableSlots[3],
    },
  });
  // } else {
  // return handleWelcomeMessage(senderNumber);
  // }
};

const handleSlotSelection = async (senderNumber, selectedSlot) => {
  const userState = userStates.get(senderNumber) || {
    stage: "awaiting_payment_choice",
  };
  userState.stage = "awaiting_payment_choice";
  userState.selectedSlot = selectedSlot;
  userStates.set(senderNumber, userState);
  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_PAYMENT_OPTIONS_TEMPLATE_ID,
  });
};

const handlePaymentChoice = async (senderNumber, choice) => {
  const userState = userStates.get(senderNumber);
  // const redirectUrl =
  //   choice === "pay_now"
  //     ? process.env.PAYMENT_GATEWAY_URL
  //     : process.env.BOOKING_CONFIRMATION_URL;
  userState.stage = "booking_completed";
  userState.paymentChoice = choice;
  userStates.set(senderNumber, userState);
  // await sendMessage({
  //   to: senderNumber,
  //   sid: process.env.TWILIO_REDIRECT_TEMPLATE_ID,
  //   variables: JSON.stringify({
  //     1: redirectUrl,
  //   }),
  // });
  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_BOOKING_CONFIRMATION_TEMPLATE_ID,
    variables: {
      1: userState?.selectedPlumber,
      2: userState?.formData?.preferredDate,
      3: availableSlots[parseInt(userState?.selectedSlot.split("_")[1]) - 1],
      4: choice === "pay_now" ? "Payment Pending" : "Pay at Service",
    },
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
      switch (userState.selectedService) {
        case "service_1":
          return handlePlumbingService(senderNumber, location);
        case "service_2":
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

    if (userState.stage === "awaiting_plumber_selection" && req.body.ListId) {
      return handlePlumberSelection(senderNumber, req.body.ListId);
    }

    if (userState.stage === "awaiting_slot_selection" && req.body.ListId) {
      return handleSlotSelection(senderNumber, req.body.ListId);
    }

    if (userState.stage === "awaiting_payment_choice" && req.body.ButtonPayload) {
      return handlePaymentChoice(senderNumber, req.body.ButtonPayload);
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
  handleFormSubmission,
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

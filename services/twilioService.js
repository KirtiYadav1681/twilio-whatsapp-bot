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
    variables: {
      "1": senderNumber  // Make sure the key is a string
    }
  });
};

const handleLocationRequest = async (senderNumber, selectedService) => {
  return sendMessage({
    to: senderNumber,
    body: "Please share your location so we can find the nearest service provider.",
  });
};

const plumbers = [
  { id: 1, name: "Plumber One", rating: 4.5, distance: 2 },
  { id: 2, name: "Plumber Two", rating: 4.8, distance: 3 },
  { id: 3, name: "Plumber Three", rating: 4.2, distance: 3.5 },
];

const handlePlumbingService = async (senderNumber, location) => {
  userStates.set(senderNumber, {
    stage: "awaiting_plumber_selection",
    selectedService: "plumbing",
    location,
  });

  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_PLUMBING_SERVICE_TEMPLATE_ID,
    variables: JSON.stringify(templateVariables),
  });
};

const handlePlumberSelection = async (senderNumber, plumberId) => {
  const userState = userStates.get(senderNumber);
  userState.selectedPlumber = plumberId;
  userState.stage = "awaiting_form_submission";
  userStates.set(senderNumber, userState);

  // Send Google Form link
  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_FORM_TEMPLATE_ID,
    variables: JSON.stringify({
      1: "https://forms.gle/your-form-url",
      2: "Once you've submitted the form, please reply with 'FORM SUBMITTED'",
    }),
  });
};

const handleFormSubmission = async (senderNumber, formData) => {
  const userState = userStates.get(senderNumber);
  userState.stage = "awaiting_slot_selection";
  userState.formData = formData;
  userStates.set(senderNumber, userState);

  // Get available slots for the date from form
  const availableSlots = ["10:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"];

  // Send template with available slots
  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_SLOTS_TEMPLATE_ID,
    variables: JSON.stringify({
      date: formData.preferredDate,
      1: availableSlots[0],
      2: availableSlots[1],
      3: availableSlots[2],
      4: availableSlots[3],
    }),
  });
};

const handleSlotSelection = async (senderNumber, selectedSlot) => {
  const userState = userStates.get(senderNumber);
  userState.stage = "awaiting_payment_choice";
  userState.selectedSlot = selectedSlot;
  userStates.set(senderNumber, userState);

  // Send payment options template
  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_PAYMENT_OPTIONS_TEMPLATE_ID,
  });
};

const handlePaymentChoice = async (senderNumber, choice) => {
  const userState = userStates.get(senderNumber);
  const redirectUrl =
    choice === "pay_now"
      ? process.env.PAYMENT_GATEWAY_URL
      : process.env.BOOKING_CONFIRMATION_URL;

  // Store the final booking details
  userState.stage = "booking_completed";
  userState.paymentChoice = choice;
  userStates.set(senderNumber, userState);

  // Send redirect template
  await sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_REDIRECT_TEMPLATE_ID,
    variables: JSON.stringify({
      1: redirectUrl,
    }),
  });

  // Send booking confirmation after redirect
  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_BOOKING_CONFIRMATION_TEMPLATE_ID,
    variables: JSON.stringify({
      date: userState.formData.preferredDate,
      time: userState.selectedSlot,
      plumber: `Plumber ${userState.selectedPlumber}`,
      paymentStatus:
        choice === "pay_now" ? "Payment Pending" : "Pay at Service",
    }),
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
      // return handlePlumbingService(senderNumber);
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

    if (userState.stage === "awaiting_plumber_selection" && req.body.ListId) {
      // if (userState.stage === "awaiting_plumber_selection" && req.body.ListId) {

      return handlePlumberSelection(senderNumber, req.body.ListId);
    }

    if (
      userState.stage === "awaiting_form_submission" &&
      msg === "form submitted"
    ) {
      // In production, you'd verify form submission through Google Forms API
      const formData = {
        preferredDate: "2025-01-16", // This would come from form submission
      };

      return handleFormSubmission(senderNumber, formData);
    }

    if (userState.stage === "awaiting_slot_selection" && req.body.ListId) {
      return handleSlotSelection(senderNumber, req.body.ListId);
    }

    if (userState.stage === "awaiting_payment_choice" && req.body.ListId) {
      return handlePaymentChoice(senderNumber, req.body.ListId);
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

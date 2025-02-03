const twilio = require("twilio");
const config = require("../config/twilio.config");
const templates = require("../constants/messageTemplates");
const isValidDate = require("../utils/utilityFunctions");

const availableSlots = ["10:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"];
const serviceConfig = {
  service_1: {
    key: "plumbing",
    serviceTemplateId: process.env.TWILIO_PLUMBING_SERVICE_TEMPLATE_ID,
    subCategories: [
      {
        id: 1,
        name: "Commercial Plumbing",
        key: "commercial_plumbing",
        description: "Commercial plumbing services for offices & restaurants.",
      },
      {
        id: 2,
        name: "Drains",
        key: "drains",
        description: "Clear clogged drains & perform drain maintenance.",
      },
      {
        id: 3,
        name: "Gas Fittings",
        key: "gas_fittings",
        description: "Install, repair & maintain gas fittings.",
      },
    ],
    providers: [
      {
        id: 1,
        name: "Plumber 1",
        key: "plumber_1",
        price: "$100",
        rating: "4.2⭐",
      },
      {
        id: 2,
        name: "Plumber 2",
        key: "plumber_2",
        price: "$150",
        rating: "4.7⭐",
      },
    ],
  },
  service_2: {
    key: "electrical",
    serviceTemplateId: process.env.TWILIO_ELECTRICAL_SERVICE_TEMPLATE_ID,
    subCategories: [
      {
        id: 1,
        name: "Residential Electrical",
        key: "residential_electrical",
        description: "Residential electrical services & repairs.",
      },
      {
        id: 2,
        name: "Commercial Electrical",
        key: "commercial_electrical",
        description: "Commercial electrical services & repairs.",
      },
      {
        id: 3,
        name: "Electrical Repairs",
        key: "electrical_repairs",
        description: "Repair faulty wiring, outlets & circuit breakers.",
      },
    ],
    providers: [
      {
        id: 1,
        name: "Electrician 1",
        key: "electrician_1",
        price: "$80",
        rating: "4.5⭐",
      },
      {
        id: 2,
        name: "Electrician 2",
        key: "electrician_2",
        price: "$120",
        rating: "4.8⭐",
      },
    ],
  },
  service_3: {
    key: "ac-service",
    serviceTemplateId: process.env.TWILIO_AC_SERVICE_TEMPLATE_ID,
    subCategories: [
      {
        id: 1,
        name: "AC Installation",
        key: "ac_installation",
        description: "Install new AC units for homes & offices.",
      },
      {
        id: 2,
        name: "AC Repair",
        key: "ac_repair",
        description: "Repair faulty AC units & fix cooling issues.",
      },
      {
        id: 3,
        name: "AC Maintenance",
        key: "ac_maintenance",
        description: "Regular AC maintenance for optimal performance.",
      },
    ],
    providers: [
      {
        id: 1,
        name: "AC Technician 1",
        key: "ac_technician_1",
        price: "$60",
        rating: "4.3⭐",
      },
      {
        id: 2,
        name: "AC Technician 2",
        key: "ac_technician_2",
        price: "$90",
        rating: "4.6⭐",
      },
    ],
  },
};
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
    console.log("Error sending message:", error);
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

const handleViewCatalog = async (senderNumber) => {
  userStates.set(senderNumber, { stage: "awaiting_service_selection" });
  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_PLUMBING_SERVICE_CATALOG,
  });
};

const handleServiceProviders = async (senderNumber, location, serviceType) => {
  const service = serviceConfig[serviceType];
  if (!service) {
    return handleDefaultResponse(senderNumber);
  }

  userStates.set(senderNumber, {
    stage: "awaiting_provider_selection",
    selectedService: serviceType,
    location,
  });

  const providers = service.providers;
  return sendMessage({
    to: senderNumber,
    sid: service.serviceTemplateId,
    variables: {
      1: providers[0].name,
      2: providers[0].key,
      3: providers[0].price,
      4: providers[0].rating,
      5: providers[1].name,
      6: providers[1].key,
      7: providers[1].price,
      8: providers[1].rating,
    },
  });
};

const handleProviderSelection = async (senderNumber, providerId) => {
  const userState = userStates.get(senderNumber);
  userState.selectedProvider = providerId;
  userState.stage = "awaiting_date";
  userStates.set(senderNumber, userState);

  return sendMessage({
    to: senderNumber,
    body: "Please provide your preferred date for the service in DD/MM/YYYY format",
  });
};

const handleDateSubmission = async (senderNumber, dateString) => {
  const userState = userStates.get(senderNumber);

  if (!isValidDate.isValidDate(dateString)) {
    return sendMessage({
      to: senderNumber,
      body: "Invalid date format or past date. Please provide a valid future date in DD/MM/YYYY format",
    });
  }

  userState.preferredDate = dateString;
  userState.stage = "awaiting_service_address";
  userStates.set(senderNumber, userState);

  return sendMessage({
    to: senderNumber,
    body: "Please provide the exact address where you need the service to be performed",
  });
};

const handleServiceAddressSubmission = async (senderNumber, address) => {
  const userState = userStates.get(senderNumber);
  userState.serviceAddress = address;
  userState.stage = "awaiting_slot_selection";
  userStates.set(senderNumber, userState);

  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_SLOTS_TEMPLATE_ID,
    variables: {
      date: userState.preferredDate,
      1: availableSlots[0],
      2: availableSlots[1],
      3: availableSlots[2],
      4: availableSlots[3],
    },
  });
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
  userState.stage = "booking_completed";
  userState.paymentChoice = choice;
  userStates.set(senderNumber, userState);

  const service = serviceConfig[userState.selectedService];
  const provider = service.providers.find(
    (p) => p.key === userState.selectedProvider
  );

  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_BOOKING_CONFIRMATION_TEMPLATE_ID,
    variables: {
      1: provider.name,
      2: userState?.preferredDate,
      3: availableSlots[parseInt(userState?.selectedSlot.split("_")[1]) - 1],
      4: choice === "pay_now" ? "Payment Pending" : "Pay at Service",
    },
  });
};

const handleServiceSelection = async (senderNumber, selectedService) => {
  const service = serviceConfig[selectedService];
  if (!service) {
    return handleDefaultResponse(senderNumber);
  }

  userStates.set(senderNumber, {
    stage: "awaiting_sub_category_selection",
    selectedService,
  });

  const subCategories = service.subCategories;
  const subCategoryOptions = subCategories.map((category) => ({
    label: category.name,
    value: category.key,
    description: category.description,
  }));

  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_SUB_CATEGORY_TEMPLATE_ID,
    variables: {
      1: service.key,
      2: subCategoryOptions[0].label,
      3: subCategoryOptions[0].value,
      4: subCategoryOptions[0].description,
      5: subCategoryOptions[1].label,
      6: subCategoryOptions[1].value,
      7: subCategoryOptions[1].description,
      8: subCategoryOptions[2].label,
      9: subCategoryOptions[2].value,
      10: subCategoryOptions[2].description,
    },
  });
};

const handleSubCategorySelection = async (
  senderNumber,
  selectedSubCategory
) => {
  const userState = userStates.get(senderNumber);
  userState.selectedSubCategory = selectedSubCategory;
  userState.stage = "awaiting_location";
  userStates.set(senderNumber, userState);

  return handleLocationRequest(senderNumber, userState.selectedService);
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

    switch (userState.stage) {
      case "awaiting_service_selection":
        if (req.body.ListId) {
          return handleServiceSelection(senderNumber, req.body.ListId);
        }
        break;
      case "awaiting_sub_category_selection":
        if (req.body.ListId) {
          return handleSubCategorySelection(senderNumber, req.body.ListId);
        }
        break;

      case "awaiting_location":
        if (req.body.Latitude && req.body.Longitude) {
          const location = {
            latitude: req.body.Latitude,
            longitude: req.body.Longitude,
          };
          return handleServiceProviders(
            senderNumber,
            location,
            userState.selectedService
          );
        }
        return sendMessage({
          to: senderNumber,
          body: "Please share your location to proceed with the service request.",
        });

      case "awaiting_provider_selection":
        if (req.body.ListId) {
          return handleProviderSelection(senderNumber, req.body.ListId);
        }
        break;

      case "awaiting_date":
        return handleDateSubmission(senderNumber, incomingMsg.trim());

      case "awaiting_service_address":
        return handleServiceAddressSubmission(senderNumber, incomingMsg.trim());

      case "awaiting_slot_selection":
        if (req.body.ListId) {
          return handleSlotSelection(senderNumber, req.body.ListId);
        }
        break;

      case "awaiting_payment_choice":
        if (req.body.ButtonPayload) {
          return handlePaymentChoice(senderNumber, req.body.ButtonPayload);
        }
        break;
    }

    if (
      userState.stage === "new" &&
      (msg.includes("hello") || msg.includes("hi"))
    ) {
      return handleWelcomeMessage(senderNumber);
    }

    if (msg === "view catalog") {
      return handleViewCatalog(senderNumber);
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
    handleDefaultResponse,
  },
};

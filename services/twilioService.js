const twilio = require("twilio");
const config = require("../config/twilio.config");
const templates = require("../constants/messageTemplates");
const axios = require("axios");

const mediaLink =
  "https://scontent.fidr4-1.fna.fbcdn.net/v/t45.5328-4/473220313_916799780569075_8624869622659393500_n.jpg?stp=c2.115.476.249a_dst-jpg_p480x480_tt6&_nc_cat=103&ccb=1-7&_nc_sid=657aed&_nc_ohc=fHpqqpVo2oUQ7kNvgHp4Fqq&_nc_zt=23&_nc_ht=scontent.fidr4-1.fna&_nc_gid=A9Rk1Xr6Aout6dkLSRCS3Xq&oh=00_AYDgRYRZV1GgF-AdY11TtZeaeqTnBXDq4_gX7Hp5uB-b6w&oe=67966C0E";

const serviceConfig = {
  service_1: {
    key: "plumbing",
    serviceTemplateId: process.env.TWILIO_PLUMBING_SERVICE_TEMPLATE_ID,
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
    key: "ac-srvice",
    serviceTemplateId: process.env.TWILIO_AC_SERVICE_TEMPLATE_ID,
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
        name: "AC Technician 1",
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
      // locale: "en_US",
    };

    if (sid) {
      messageParams.contentSid = sid;
      if (variables) {
        messageParams.contentVariables = JSON.stringify(variables);
      }
    } else {
      messageParams.body = body;
    }

    console.log("messageParams: ", messageParams);

    return await client.messages.create(messageParams);
  } catch (error) {
    console.log("Error sending message:", error);
    throw new Error(`Failed to send message: ${error.message}`);
  }
};

// const createCatalogContent = async () => {
//   try {
//     const response = await axios.post(
//       `https://content.twilio.com/v1/Content`,
//       {
//         friendlyName: "Catalog - all products",
//         language: "en",
//         variables: {
//           1: "menu_title",
//           2: "menu_name",
//         },
//         types: {
//           "twilio/catalog": {
//             id: "1368966904276860", // Your catalog ID
//             title: "The Menu: {{1}}",
//             body: "Hi, check out this menu {{2}}",
//             subtitle: "Great deals",
//             thumbnail_item_id: "bf7ogzov9k", // Your product ID
//           },
//         },
//       },
//       {
//         auth: {
//           username: process.env.TWILIO_ACCOUNT_SID,
//           password: process.env.TWILIO_AUTH_TOKEN,
//         },
//       }
//     );

//     return response.data.sid;
//   } catch (error) {
//     console.error("Error creating catalog content:", error);
//     throw error;
//   }
// };

const handleWelcomeMessage = async (senderNumber) => {
  userStates.set(senderNumber, { stage: "awaiting_service_selection" });
  // try {
  //   // const catalogContentSid = await createCatalogContent();

  //   const messageParams = {
  //     from: config.fromNumber,
  //     to: senderNumber,
  //     contentType: "twilio/catalog",
  //     contentSid: "HX4c14f7240984ac4c4bb1cebe195a7a74",
  //     contentVariables: JSON.stringify({
  //       1: "Our Services",
  //       2: "Service Catalog",
  //     }),
  //   };

  //   return await client.messages.create(messageParams);
  // } catch (error) {
  //   console.log("Error sending catalog:", error);
  //   throw new Error(`Failed to send catalog: ${error.message}`);
  // }

  //   sid: process.env.TWILIO_PLUMBING_SERVICE_CATALOG,

  return sendMessage({
    to: senderNumber,
    // sid: process.env.TWILIO_SERVICE_TEMPLATE_ID,
    sid: process.env.TWILIO_PLUMBING_SERVICE_CATALOG,

    // variables: catalogVariables,
    // variables: {
    //   1: senderNumber.split(":")[1],
    // },
  });
};

const handleLocationRequest = async (senderNumber, selectedService) => {
  return sendMessage({
    to: senderNumber,
    body: "Please share your location so we can find the nearest service provider.",
  });
};
const plumbers = [
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
];

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
const handlePlumbingService = async (senderNumber, location) => {
  userStates.set(senderNumber, {
    stage: "awaiting_plumber_selection",
    selectedService: "plumbing",
    location,
  });

  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_PLUMBING_SERVICE_TEMPLATE_ID,
    variables: {
      1: plumbers[0].name,
      2: plumbers[0].key,
      3: plumbers[0].price,
      4: plumbers[0].rating,
      5: plumbers[1].name,
      6: plumbers[1].key,
      7: plumbers[1].price,
      8: plumbers[1].rating,
    },
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
  const userState = userStates.get(senderNumber);
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

  const service = serviceConfig[userState.selectedService];
  const provider = service.providers.find(
    (p) => p.key === userState.selectedProvider
  );

  return sendMessage({
    to: senderNumber,
    sid: process.env.TWILIO_BOOKING_CONFIRMATION_TEMPLATE_ID,
    variables: {
      1: provider.name,
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
      return handleServiceProviders(
        senderNumber,
        location,
        userState.selectedService
      );
    }

    if (userState.stage === "awaiting_location") {
      return sendMessage({
        to: senderNumber,
        body: "Please share your location to proceed with the service request.",
      });
    }

    if (userState.stage === "awaiting_provider_selection" && req.body.ListId) {
      return handleProviderSelection(senderNumber, req.body.ListId);
    }

    if (userState.stage === "awaiting_slot_selection" && req.body.ListId) {
      return handleSlotSelection(senderNumber, req.body.ListId);
    }

    if (
      userState.stage === "awaiting_payment_choice" &&
      req.body.ButtonPayload
    ) {
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

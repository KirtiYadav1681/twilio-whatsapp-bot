const Twilio = require("twilio");
const dotenv = require("dotenv");

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = new Twilio(accountSid, authToken);

const createSubaccountController = async (req, res) => {
  try {
    const { subaccountName } = req.body;

    if (!subaccountName) {
      throw new Error("Subaccount name is required");
    }

    const subaccount = await client.api.v2010.accounts.create({
      friendlyName: subaccountName,
    });

    res
      .status(201)
      .json({ message: "Subaccount created successfully", subaccount });
  } catch (error) {
    console.error("Error creating subaccount:", error);
    res
      .status(400) // Use 400 Bad Request instead of 500
      .json({ message: "Error creating subaccount", error: error.message });
  }
};

const createAddressController = async (req, res) => {
  try {
    const {
      subaccountSid,
      customerName,
      street,
      city,
      region,
      postalCode,
      isoCountry,
    } = req.body;

    if (
      !subaccountSid ||
      !customerName ||
      !street ||
      !city ||
      !region ||
      !postalCode ||
      !isoCountry
    ) {
      throw new Error("All address fields are required");
    }

    const address = await client.api.v2010
      .accounts(subaccountSid)
      .addresses.create({
        customerName,
        street,
        city,
        region,
        postalCode,
        isoCountry,
      });

    res.status(201).json({ message: "Address created successfully", address });
  } catch (error) {
    console.error("Error creating Address:", error);
    res
      .status(400)
      .json({ message: "Error creating Address", error: error.message });
  }
};

const verifyBusinessPhoneNumberController = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    const verification = await client.verify
      .services(process.env.TWILIO_VERIFY_BUSINESS_NUMBER_SERVICE)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });

    res.status(201).json({
      message: "Business phone number verification initiated",
      verification,
    });
  } catch (error) {
    console.error("Error verifying business phone number:", error);
    res.status(400).json({
      message: "Error verifying business phone number",
      error: error.message,
    });
  }
};

const verifyOTPController = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      throw new Error("Phone number and OTP are required");
    }

    const serviceSid = process.env.TWILIO_VERIFY_BUSINESS_NUMBER_SERVICE;
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: otp,
      });

    if (verificationCheck.status === "approved") {
      res.status(200).json({ message: "OTP verified successfully" });
    } else {
      res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res
      .status(400)
      .json({ message: "Error verifying OTP", error: error.message });
  }
};

const createWhatsAppBusinessApiServiceController = async (req, res) => {
  try {
    const subaccountClient = new Twilio(
      req.body.subaccountid,
      req.body.subaccounttoken
    );
    const service = await subaccountClient.chat.v1.services.create({
      friendlyName: "Your WhatsApp Business API Service",
    });
    res.status(201).json({
      message: "WhatsApp Business API Service created",
      serviceSid: service.sid,
    });
  } catch (error) {
    console.error("Error creating WhatsApp Business API Service:", error);
    res.status(400).json({
      message: "Error creating WhatsApp Business API Service",
      error: error.message,
    });
  }
};

const submitBusinessProfileController = async (req, res) => {
  try {
    const subaccountClient = new Twilio(
      req.body.subaccountid,
      req.body.subaccounttoken
    );
    // const serviceSid = req.body.serviceSid;
    const serviceSid = process.env.TWILIO_WHATSAPP_BUSINESS_API_SERVICE_ID;
    const businessName = req.body.businessName;
    const businessDescription = req.body.businessDescription;

    const profile = await subaccountClient.chat.v1.services(serviceSid).update({
      friendlyName: businessName,
      description: businessDescription,
    });
    res.status(201).json({ message: "Business Profile submitted", profile });
  } catch (error) {
    console.error("Error submitting Business Profile:", error);
    res.status(400).json({
      message: "Error submitting Business Profile",
      error: error.message,
    });
  }
};

const createAutopilotAssistantController = async (req, res) => {
  try {
    const assistantName = req.body.assistantName;
    const assistant = await client.autopilot.v1.assistants
      .create({
        friendlyName: assistantName,
      });

    console.log("Assistant SID: ", assistant.sid);

    res.status(201).json({
      message: "Autopilot Assistant created",
      assistantSid: assistant.sid,
    });
  } catch (error) {
    console.error("Error creating Autopilot Assistant:", error);
    res.status(400).json({
      message: "Error creating Autopilot Assistant",
      error: error.message,
    });
  }
};

const setUpMessageTemplatesController = async (req, res) => {
  try {
    const subaccountSid = req.body.subaccountSid;
    const serviceSid = process.env.TWILIO_WHATSAPP_BUSINESS_API_SERVICE_ID;
    const templateName = req.body.templateName;
    const templateBody = req.body.templateBody;

    const subaccountClient = new Twilio(
      subaccountSid,
      req.body.subaccountToken
    );

    // const template = await subaccountClient.messaging.messageTemplates.create({
    //   name: templateName,
    //   body: templateBody,
    // });

    const template = await client.messaging.messageTemplates.create({
      name: templateName,
      body: templateBody,
    });

    console.log("template: ", template);

    res.status(201).json({
      message: "Message template set up",
      templateSid: template.sid,
    });
  } catch (error) {
    console.error("Error setting up message template:", error);
    res.status(400).json({
      message: "Error setting up message template",
      error: error.message,
    });
  }
};

const configureWebhookController = async (req, res) => {
  try {
    const subaccountClient = new Twilio(
      req.body.subaccountid,
      req.body.subaccounttoken
    );
    const serviceSid = process.env.TWILIO_WHATSAPP_BUSINESS_API_SERVICE_ID;
    // const serviceSid = req.body.serviceSid;
    const webhookUrl = req.body.webhookUrl;

    const webhook = await subaccountClient.messaging.v1
      .services(serviceSid)
      .incomingWebhooks.create({
        method: "POST",
        url: webhookUrl,
        filters: ["incoming-message", "message-status-updated"],
      });
    res
      .status(201)
      .json({ message: "Webhook configured successfully", webhook });
  } catch (error) {
    console.error("Error configuring Webhook:", error);
    res.status(400).json({
      message: "Error configuring Webhook",
      error: error.message,
    });
  }
};

const whatsappIncomingController = async (req, res) => {
  try {
    const messageSid = req.body.MessageSid;
    const fromNumber = req.body.From;
    const messageBody = req.body.Body;

    console.log(
      `Received incoming WhatsApp message from ${fromNumber}: ${messageBody}`
    );

    // Get the sub-account's Twilio credentials
    const subaccountSid = req.body.AccountSid;
    const subaccountToken = req.body.AuthToken;

    // Create a new Twilio client using the sub-account's credentials
    const twilioClient = new Twilio(subaccountSid, subaccountToken);

    // Respond to the incoming message using the sub-account's Twilio client
    const response = await twilioClient.messages.create({
      from: req.body.To,
      to: fromNumber,
      body: "Thank you for your message!",
    });

    console.log(`Responded to incoming WhatsApp message: ${response.sid}`);

    res.status(200).send("Incoming WhatsApp message processed");
  } catch (error) {
    console.error("Error processing incoming WhatsApp message:", error);
    res.status(500).send("Error processing incoming WhatsApp message");
  }
};

module.exports = {
  createSubaccountController,
  createAddressController,
  verifyBusinessPhoneNumberController,
  verifyOTPController,
  createWhatsAppBusinessApiServiceController,
  submitBusinessProfileController,
  configureWebhookController,
  whatsappIncomingController,
  setUpMessageTemplatesController,
  createAutopilotAssistantController
};

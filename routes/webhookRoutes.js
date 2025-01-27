const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const subaccountController = require("../controllers/subaccountController");

router.post("/webhook", messageController.handleWebhook);
router.get("/", (req, res) => res.status(200).send("Server is running!"));

router.post("/submit-form", messageController.handleFormSubmit);

// STEP 1
/**
 * @swagger
 * /create-subaccount:
 *   post:
 *     summary: Create a subaccount
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subaccountName
 *             properties:
 *               subaccountName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Subaccount created successfully with the newly created subaccount.
 *       500:
 *          description: Internal Server error.
 */
router.post(
  "/create-subaccount",
  subaccountController.createSubaccountController
);

// STEP 2
/**
 * @swagger
 * /create-address-sid:
 *   post:
 *     summary: Create an address sid for the subaccount
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sid
 *               - customerName
 *               - street
 *               - city
 *               - region
 *               - postalCode
 *               - isoCountry
 *             properties:
 *               sid:
 *                 type: string
 *               customerName:
 *                 type: string
 *               street:
 *                 type: string
 *               city:
 *                 type: string
 *               region:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               isoCountry:
 *                 type: string
 *     responses:
 *       201:
 *         description: Address sid created successfully for subaccount.
 *       500:
 *          description: Internal Server error.
 */
router.post(
  "/create-address-sid",
  subaccountController.createAddressController
);

// BEFORE THIS STEP -> CREATE A NEW VERIFICATION SERVICE, USE SMS AND CALL, AND YOU WILLL GET A SERVICE ID, HERE IT IS TWILIO_VERIFY_BUSINESS_NUMBER_SERVICE IN THE ENV
// STEP 3
router.post(
  "/verify-business-phone-number",
  subaccountController.verifyBusinessPhoneNumberController
);

// STEP 4
router.post("/verify-otp", subaccountController.verifyOTPController);

// STEP 5 -> the service id you get from this step is to be used in the next step
router.post(
  "/create-whatsapp-business-api-service",
  subaccountController.createWhatsAppBusinessApiServiceController
);

// STEP 6
router.post(
  "/submit-business-profile",
  subaccountController.submitBusinessProfileController
);

router.post(
  "/create-assistant",
  subaccountController.createAutopilotAssistantController
);

// STEP 8: Set Up Message Templates
router.post(
  "/set-up-message-templates",
  subaccountController.setUpMessageTemplatesController
);

router.post(
  "/configure-webhook",
  subaccountController.configureWebhookController
);

// before this step you need to configure the webhook url for incoming and outgoing messages
router.post(
  "/whatsapp/incoming",
  subaccountController.whatsappIncomingController
);

module.exports = router;

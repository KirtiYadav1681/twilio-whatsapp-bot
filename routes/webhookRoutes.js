const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const subaccountController = require("../controllers/subAccountController");

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
/**
 * @swagger
 * /verify-business-phone-number:
 *   post:
 *     summary: Send otp to verify business phone number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Otp sent to number successfully.
 *       500:
 *          description: Internal Server error.
 */
router.post(
  "/verify-business-phone-number",
  subaccountController.verifyBusinessPhoneNumberController
);

// STEP 4
/**
 * @swagger
 * /verify-otp:
 *   post:
 *     summary: Enter otp to verify business phone number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Otp verified.
 *       500:
 *          description: Internal Server error.
 */
router.post("/verify-otp", subaccountController.verifyOTPController);

// STEP 5 -> the service id you get from this step is to be used in the next step
/**
 * @swagger
 * /create-whatsapp-business-api-service:
 *   post:
 *     summary: Create whatsapp business api service  sid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subaccountid
 *               - subaccounttoken
 *             properties:
 *               subaccountid:
 *                 type: string
 *               subaccounttoken:
 *                 type: string
 *     responses:
 *       201:
 *         description: Whatsapp business api service sid created
 *       500:
 *          description: Internal Server error.
 */
// You will need this service sid in the next step
router.post(
  "/create-whatsapp-business-api-service",
  subaccountController.createWhatsAppBusinessApiServiceController
);

// STEP 6
/**
 * @swagger
 * /submit-business-profile:
 *   post:
 *     summary: Submit business profile's details
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subaccountid
 *               - subaccounttoken
 *               - servicesid
 *             properties:
 *               subaccountid:
 *                 type: string
 *               subaccounttoken:
 *                 type: string
 *               servicesid:
 *                 type: string
 *     responses:
 *       201:
 *         description: Business Profile submitted
 *       500:
 *          description: Internal Server error.
 */
router.post(
  "/submit-business-profile",
  subaccountController.submitBusinessProfileController
);

router.post(
  "/create-assistant",
  subaccountController.createAutopilotAssistantController
);

router.post('/create-messaging-service', subaccountController.createMessagingServiceSidController)

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

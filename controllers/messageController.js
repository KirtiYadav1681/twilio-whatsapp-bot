const twilioService = require("../services/twilioService");

const handleWebhook = async (req, res) => {
  try {
    const incomingMsg = req?.body?.Body;
    const senderNumber = req?.body?.From;

    if (!senderNumber) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields",
      });
    }
    await twilioService.handleIncomingMessage(req, incomingMsg, senderNumber);
    return res.status(200).json({
      status: "success",
      message: "Response sent",
    });
  } catch (error) {
    console.log("Error in handleWebhook:", error);
    return res.status(500).json({
      status: "error",
      message: "Error processing message",
      error: error.message,
    });
  }
};

const handleFormSubmit = async (req,res) => {
  const { name, address, date, number } = req.body
  
  const formData = { name, address, preferredDate: date };

  try {
    await twilioService.handleFormSubmission(number, formData);
    res.send("Thank you! Your form has been submitted.");
  } catch (error) {
    console.error("Error handling form submission:", error);
    res.status(500).send("There was an error processing your request.");
  }
}

module.exports = {
  handleWebhook,
  handleFormSubmit
};

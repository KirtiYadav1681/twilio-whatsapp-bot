const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

router.post("/webhook", messageController.handleWebhook);

router.get("/", async (req, res) => {
  const code = req.query.code;

  if (!code) return res.send("No code returned from Meta.");
  const redirectUri = encodeURIComponent("https://localhost:8888/");

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_CLIENT_ID}&redirect_uri=${redirectUri}&client_secret=${process.env.META_CLIENT_SECRET}&code=${code}`
    );
    const data = await tokenRes.json();

    const accessToken = data.access_token;
    if (!accessToken) return res.status(500).send("Access token not found.");

    const businessRes = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${accessToken}`
    );
    const businessData = await businessRes.json();
    console.log("Business Info: ", businessData);
    res.send("Signup complete. Check console.");
  } catch (err) {
    console.log("OAuth Error:", err);
    res.status(500).send("Something went wrong.");
  }
});

module.exports = router;

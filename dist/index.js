"use strict";

require("dotenv").config();
var express = require("express");
var bodyParser = require("body-parser");
var webhookRoutes = require("./routes/webhookRoutes");
var path = require("path");
var swaggerUi = require('swagger-ui-express');
var swaggerSpec = require('./swagger');
var app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/", webhookRoutes);
app.get("/form", function (req, res) {
  var senderNumber = req.query.number;
  res.render("form", {
    number: senderNumber
  });
});
var PORT = process.env.PORT || 8888;
app.listen(PORT, function () {
  console.log("Server is running on port: ".concat(PORT));
});
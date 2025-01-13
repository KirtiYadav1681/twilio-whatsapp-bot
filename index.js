require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/', webhookRoutes);

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});


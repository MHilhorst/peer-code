require('dotenv').config();
const mongoose = require('mongoose');
const sulla = require('sulla');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const compression = require('compression');
const User = require('./models/User');

const PORT = process.env.PORT || 5000;

const app = express();
const server = require('http').Server(app);

let client;

const corsOptions = {
  optionsSuccessStatus: 200,
};

app.use(morgan('dev'));
app.use(cors(corsOptions));
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_KEY, async (err) => {
  if (err) {
    console.log(err);
  }
});

sulla
  .create(
    './sessions/session',
    (qrCode, asciiQr) => {
      console.log(asciiQr);
    },
    { logQR: true, useChrome: true }
  )
  .then(async (client) => {
    app.set('client', client);
    await client.sendText('31643685618@c.us', '👋 Hello from sulla!');
  });

mongoose.set('useFindAndModify', false);

app.get('/', (req, res) => {
  console.log(req.app.get('client'));
});

app.post('/users', async (req, res) => {
  const number = req.body.number;
  const name = req.body.name;
  const user = await User.findOne({ phone_number: number }).exec();
  if (!user) {
    const newUser = new User({
      name,
      phone_number: number,
    });
    newUser.save().then(() => {
      res.status(200).send('succesfully made new account');
    });
  } else {
    res.status(400).send('User already exists');
  }
});

app.get('/beer/:number', async (req, res) => {
  const user = await User.findOne({ phone_number: req.params.number }).exec();
  if (user) {
    const client = req.app.get('client');
    user.beer_amount = user.beer_amount + 1;
    const update = {
      timestamp: Date.now(),
      amount: 1,
    };
    user.updates.push(update);
    await user.save();
    await client.sendText(
      `${user.phone_number}@c.us`,
      `Je hebt een biertje gepakt \n \n Totaal biertjes: ${user.beer_amount}. Geniet van je biertje!`
    );
    res.status(200).send('Succesfully added 1 beer');
  } else {
    res.status(400).send('No user exists for this number');
  }
});

app.get('/close', (req, res) => {
  const client = req.app.get('client');
  client.close();
});

server.listen(5000, () => console.log(`Mixing it up on port ${PORT}`));

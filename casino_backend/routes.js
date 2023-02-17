const express = require("express");
const router = express.Router();
const Joi = require("@hapi/joi");
const {generateEthWallet} = require('./helpers')

const { createUser, signinUser, enterRoom, getUser } = require("./db");

const userSchema = Joi.object().keys({
  firstname: Joi.string().max(20),
  lastname: Joi.string().max(20),
  birth: Joi.string().max(20),
  phonenumber: Joi.string().max(15),
  email: Joi.string(),
  zipcode: Joi.string().max(5),
  password: Joi.string().max(30),
  chips: Joi.number().min(0),
  wallet: Joi.object(),
  privateKey: Joi.string(),
  address: Joi.string()
});

const userSigninSchema = Joi.object().keys({
  email: Joi.string(),
  password: Joi.string().max(30),
});

const roomEnterSchema = Joi.object().keys({
  email: Joi.string(),
  roomNumber: Joi.number().max(20),
  smallBlind: Joi.number().min(0),
  chips: Joi.number().min(0),
});

router.post("/api/users/signup", async (req, res) => {
  const { firstname, lastname, birth, phonenumber, email, zipcode, password } = req.body;
  const {privateKey, address} = generateEthWallet()
  const data = {
    firstname,
    lastname,
    birth,
    phonenumber,
    email,
    zipcode,
    password,
    chips: 0,
    wallet: {
      privateKey,
      address
    }
  };
  const check = userSchema.validate(data);

  if (check.error) {
    console.log(check.error);
    res.json({ result: check.error });
    return;
  }

  createUser(data);
  
  res.json({ result: "user saved" });
});

router.post("/api/users/signin", async (req, res) => {
  const { email, password } = req.body;
  const data = { email, password };
  const check = userSigninSchema.validate(data);
  if (check.error) {
    res.json({ result: check.error });
  }
  const user = await signinUser(data);
  if (user) {
    res.json({ result: "success", user });
  } else {
    res.json({ result: "email or passwd incorrect" });
  }
});

router.get("/api/users/:email", async (req, res) => {
  const { email } = req.query;
  const data = { email };
  const check = userSigninSchema.validate(data);
  if (check.error) {
    res.json({ result: check.error });
  }
  const user = await getUser(data);
  if (user) {
    res.json({ result: "getting user success", user });
  } else {
    res.json({ result: "email or passwd incorrect" });
  }
});

router.post("/api/rooms/enter", async (req, res) => {
  console.log("enter");
  const { email, roomNumber, smallBlind, chips } = req.body;
  const data = {
    email,
    roomNumber,
    smallBlind,
    chips,
  };

  const check = roomEnterSchema.validate(data);

  if (check.error) {
    res.json({ result: check.error });
    return;
  }

  enterRoom(data);
  res.json({ result: "success" });
  
});

router.post("/api/play/call", async (req, res) => {
  const { email, roomNumber } = req.body;
  const data = {
    email,
    roomNumber,
  };
});

router.post("/api/play/check", async (req, res) => {
  const { email, roomNumber } = req.body;
  const data = {
    email,
    roomNumber,
  };
});

router.post("/api/play/fold", async (req, res) => {
  const { email, roomNumber } = req.body;
  const data = {
    email,
    roomNumber,
  };
});

router.post("/api/play/raise", async (req, res) => {
  const { email, roomNumber, amount } = req.body;
  const data = {
    email,
    roomNumber,
    amount,
  };
});

module.exports = router;

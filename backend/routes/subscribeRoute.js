const express = require("express");
const Subscriber = require("../models/Subcriber");

const router = express.Router();

// @route POST /api/subscribe
// @desc Handle newsletter subscription
// @access Public
router.post("/subscribe", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Check if the email is already subcribed
    let subscriber = await Subscriber.findOne({ email });

    if (subscriber) {
      res.status(400).json({ message: "Email is already subscribe" });
    }

    // Create a new subscriber
    subscriber = new Subscriber({ email });
    await subscriber.save();

    res
      .status(201)
      .json({ message: "Successfully subscribed to the newsletter!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;

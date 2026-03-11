const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const admin = require("firebase-admin");

const serviceAccount = require("./dailycart-8155a-firebase-adminsdk-fbsvc-e6ce46d793.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();

app.get("/update", async (req, res) => {

  try {

    // Example price (scraping এর বদলে test)
    let onionPrice = 30;
    let potatoPrice = 25;

    // Onion update
    await db.collection("products").doc("oniondoc").update({
      price: onionPrice
    });

    // Potato update
    await db.collection("products").doc("potatodoc").update({
      price: potatoPrice
    });

    res.send("Prices Updated");

  } catch (error) {
    console.log(error);
    res.send("Error");
  }

});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
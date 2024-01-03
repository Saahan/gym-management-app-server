const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
var cors = require("cors");
var _ = require("lodash");
require("dotenv").config();

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors()); //enable Access-Control-Origin from all sources using cors package

const port = process.env.port || 5000;

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(process.env.REACT_APP_MONGODBURL);
}
// we create two database Schemas, one for personal details and other for diet details, linked through the uid of the user.
const gymuserSchema = new mongoose.Schema({
  uid: String,
  email: String,
  fname: String,
  lname: String,
  phoneNumber: String,
  plan: String,
  bills: Array,
  notifications: Array,
  accountType: String,
});

const userdietSchema = new mongoose.Schema({
  uid: String,
  proteinAmount: String,
  breakfast: String,
  lunch: String,
  dinner: String,
  comments: String,
});

const gymUsers = mongoose.model("gymusers", gymuserSchema);
const userDiets = mongoose.model("userdiets", userdietSchema);

//requests are self explanatory, basically storing and retrieving data from the database.

app.post("/api/signup", (req, res) => {
  let userDataObj = new gymUsers({
    uid: req.body.uid,
    email: req.body.email.toLowerCase(),
    fname: req.body.fname,
    lname: req.body.lname,
    phoneNumber: req.body.phoneNumber,
    accountType: req.body.accountType,
    plan: "",
    bills: [],
    notifications: [],
  });

  let userDietObj = new userDiets({
    uid: req.body.uid,
    breakfast: "",
    lunch: "",
    dinner: "",
    proteinAmount: "",
    comments: "",
  });

  userDataObj.save();
  userDietObj.save();
});

app.post("/api/addbillitem", (req, res) => {
  //console.log(req.body);
  let today = new Date();

  //whenever a bill item is added by the admin, a notification is sent to the user, with a date corresponding to the time of adding that bill.
  let notification = {
    message: `A bill with invoice number ${req.body.invoiceNumber} was added`,
    date: today,
    id: req.body.invoiceNumber,
  };

  let billObj = {
    amount: req.body.amount,
    date: req.body.date,
    invoiceNumber: req.body.invoiceNumber,
    comment: req.body.comments,
  };

  gymUsers
    .findOneAndUpdate(
      { uid: req.body.uid },
      { $push: { bills: billObj, notifications: notification } }
    )
    .then((docs) => res.send(docs));
});

app.get("/api/userdetails", (req, res) => {
  let user = req.query.user;
  gymUsers.find({ uid: user }).then((docs) => {
    res.send(docs);
  });
});

app.get("/api/memberdetails", (req, res) => {
  gymUsers.find({ accountType: "member" }).then((docs) => {
    res.send(docs);
  });
});

app.get("/api/userlist", (req, res) => {
  gymUsers.find({ accountType: "user" }).then((docs) => {
    res.send(docs);
  });
});

app.get("/api/dietdetails", (req, res) => {
  userDiets.find({ uid: req.query.uid }).then((docs) => {
    res.send(docs);
  });
});

app.get("/api/usernotifications", (req, res) => {
  gymUsers.find({ uid: req.query.uid }).then((docs) => {
    res.send(docs);
  });
});

app.put("/api/allotmembership", (req, res) => {
  let userID = req.body.uid;
  gymUsers
    .findOneAndUpdate({ uid: userID }, { accountType: "member" })
    .then((docs) => {
      res.send(docs);
    });
});

app.put("/api/cancelmembership", (req, res) => {
  let userID = req.body.uid;
  gymUsers
    .findOneAndUpdate({ uid: userID }, { accountType: "user", plan: "" })
    .then((docs) => {
      res.send(docs);
    });
});

app.put("/api/clearnotifications", (req, res) => {
  let userID = req.body.uid;
  gymUsers
    .findOneAndUpdate({ uid: userID }, { notifications: [] })
    .then((docs) => {
      res.send(docs);
    });
});

app.put("/api/updatememberdetails", (req, res) => {
  let userData = req.body;
  //console.log(userData);
  gymUsers
    .findOneAndUpdate(
      { uid: userData.uid },
      {
        fname: userData.fname,
        lname: userData.lname,
        phoneNumber: userData.phoneNumber,
        plan: userData.plan,
      }
    )
    .then((docs) => {
      res.send(docs);
    });
});

app.put("/api/updatedietdetails", (req, res) => {
  let dietData = req.body;

  userDiets
    .findOneAndUpdate(
      { uid: dietData.uid },
      {
        breakfast: dietData.breakfast,
        lunch: dietData.lunch,
        dinner: dietData.dinner,
        proteinAmount: dietData.proteinAmount,
        comments: dietData.comments,
      },
      { returnDocument: "before" }
    )
    .then((docs) => {
      let comparableDocs = {
        uid: docs.uid,
        breakfast: docs.breakfast,
        lunch: docs.lunch,
        dinner: docs.dinner,
        proteinAmount: docs.proteinAmount,
        comments: docs.comments,
      };

      //console.log(comparableDocs, dietData);

      //whenever the admin changes the diet details of the member, a notification is sent to the member with the date the diet was changed on.
      //two objects from before and after diet chage are compared, and if there is a difference between the values of any of the respective keys, only then a notification is generated.
      //i used Lodash to compare objects as the inbuilt javaScript object comparator does not compare different instances of objects.

      if (_.isEqual(comparableDocs, dietData)) {
        console.log("same, do not send notification");
      } else {
        console.log("not same");
        let today = new Date();
        let id = Math.floor(Math.random() * (1000 - 1 + 1)) + 1;

        let notification = {
          message: `Diet details were changed`,
          date: today,
          id: id,
        };

        gymUsers
          .findOneAndUpdate(
            { uid: docs.uid },
            { $push: { notifications: notification } }
          )
          .then(console.log("notification pushed"));
      }
    });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

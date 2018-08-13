var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var request = require("request");
var cors = require("cors");
var querystring = require("querystring");
var cookieParser = require("cookie-parser");
var PythonShell = require("python-shell");
var path = require("path");

// create our instances
const app = express();
const router = express.Router();

// set our port to either a predetermined port number if you have set it up, or 3001
const API_PORT = process.env.PORT || 3001;

// get secrets from env
const dbUri = process.env.DB_URI;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

// db config -- set your URI from mLab in secrets.js
mongoose.connect(
  dbUri,
  { useNewUrlParser: true }
);
mongoose.Promise = require("bluebird");
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

// schema object that shows the shape of your database entries.
const userSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      unique: true,
      required: true,
      validate: {
        validator: function(email) {
          var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
          return re.test(String(email).toLowerCase());
        },
        message: "{VALUE} is not a valid email address"
      }
    },
    refreshToken: {
      type: String,
      required: true,
      validate: {
        validator: function(token) {
          var re = /^[a-zA-Z0-9-_]+$/;
          return re.test(String(token).toLowerCase());
        },
        message: "{VALUE} is not a valid token"
      }
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

// now we should configure the API to use bodyParser and look for JSON data in the request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(logger("dev"));
app.use(cors());
app.use(cookieParser());

// INIT API

// serve static react

app.use(express.static(path.resolve(__dirname, '../client/build')));

// Use our router configuration when we call /api

app.use("/api", router);

router.get("/", (req, res) => {
  res.json({ message: "Hello, World!" });
});

router.get("/users", (req, res) => {
  User.find({}).then(eachOne => {
    res.json(eachOne);
  });
});

router.post("/users", (req, res) => {
  User.create({
    userEmail: req.body.userEmail,
    refreshToken: req.body.refreshToken
  }).then(function(err, user) {
    if (err) {
      res.send(err);
    } else {
      res.json(user);
    }
  });
});

router.get("/users/:userEmail", (req, res) => {
  User.findOne({ userEmail: req.params.userEmail }).then(function(err, user) {
    if (err) {
      res.send(err);
    } else if (!user) {
      res.json({ error: "user not found" });
    } else {
      res.json(user);
    }
  });
});

router.put("/users/:userEmail", (req, res) => {
  User.findOneAndUpdate(
    { userEmail: req.params.userEmail },
    { refreshToken: req.body.refreshToken }
  ).then(function(err, user) {
    if (err) {
      res.send(err);
    } else {
      res.json(user);
    }
  });
});

router.delete("/users/:userEmail", (req, res) => {
  User.findOneAndDelete({ userEmail: req.params.userEmail }).then(function(
    err,
    user
  ) {
    if (err) {
      res.send(err);
    } else {
      res.json({ success: "user deleted" });
    }
  });
});

// OAUTH WITH SPOTIFY

var generateRandomString = function(length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = "spotify_auth_state";

router.get("/login", function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope =
    "user-top-read user-read-private user-read-email playlist-modify-public";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: clientId,
        scope: scope,
        redirect_uri: redirectUri,
        state: state
      })
  );
});

router.get("/callback", function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/?" +
        querystring.stringify({
          error: "state_mismatch"
        })
    );
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer(clientId + ":" + clientSecret).toString("base64")
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        // we pass the token to the browser to make requests from there
        var uri = process.env.FRONTEND_URI || 'http://localhost:3000'
        res.redirect(
          uri + "/?" +
            querystring.stringify({
              access_token: body.access_token,
              refresh_token: body.refresh_token
            })
        );
      } else {
        res.redirect(
          uri + "/?" +
            querystring.stringify({
              error: "invalid_token"
            })
        );
      }
    });
  }
});

router.get("/refresh_token/:token", (req, res) => {
  // requesting access token from refresh token
  var refresh_token = req.params.token;
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " + new Buffer(clientId + ":" + clientSecret).toString("base64")
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        access_token: access_token
      });
    }
  });
});

// RUN PYTHON SCRIPT

router.post("/blend", (req, res) => {
  var options = {
    mode: "json",
    pythonPath: "/usr/local/bin/python3",
    // pythonOptions: ['-u'], // get print results in real-time
    // scriptPath: 'path/to/my/scripts',
    args: [req.body.song_data]
  };

  PythonShell.run("blend.py", options, function(err, results) {
    if (err) throw err;
    // results is an array consisting of messages collected during execution
    console.log("uris: %j", results);
    res.json({ uris: results });
  });
});

app.listen(API_PORT, () => console.log(`Listening on port ${API_PORT}`));

var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var request = require('request');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');


// create our instances
const app = express();
const router = express.Router();

// set our port to either a predetermined port number if you have set it up, or 3001
const API_PORT = process.env.API_PORT || 3001;

// get secrets from env
const dbUri = process.env.DB_URI
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = process.env.REDIRECT_URI

// schema object that shows the shape of your database entries.
// const UsersSchema = new mongoose.Schema({
//   userID: String,
//   accesToken: String,
//   refreshToken: String
// });

// db config -- set your URI from mLab in secrets.js
// mongoose.connect(dbUri);
// var db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// now we should configure the API to use bodyParser and look for JSON data in the request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(cors());
app.use(cookieParser());

// INIT API

// Use our router configuration when we call /api
app.use('/api', router);

router.get('/', (req, res) => {
  res.json({message: 'Hello, World!'});
});

router.get('/users', (req, res) => {
  // TODO
});

router.post('/users', (req, res) => {
  // TODO
});

router.put('/users/:userId', (req, res) => {
  // TODO
});

router.delete('/users/:userId', (req, res) => {
  // TODO
});


// OAUTH WITH SPOTIFY

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-top-read user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: clientId,
      scope: scope,
      redirect_uri: redirectUri,
      state: state
    }));


});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/?' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(clientId + ':' + clientSecret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        // we pass the token to the browser to make requests from there
        res.redirect('http://localhost:3000/?' +
          querystring.stringify({
            access_token: body.access_token,
            refresh_token: body.refresh_token
          }));
      } else {
        res.redirect('/?' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});


app.listen(API_PORT, () => console.log(`Listening on port ${API_PORT}`));

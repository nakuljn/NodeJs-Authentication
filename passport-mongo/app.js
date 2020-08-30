var express = require('express');
// var path = require('path');
var port     = process.env.PORT || 8080;
var morgan = require('morgan');
var dotenv = require('dotenv');
dotenv.config();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');
var session = require('express-session');

var routes = require('./routes/routes');
// mongoose.connect(dbConfig.url);
var uri = process.env.MongoDB_URL;
mongoose.connect(uri, { 
     useNewUrlParser: true,  
     useUnifiedTopology: true
    })
     .then(() => { 
          console.log("MongoDB Connected…")
        })
    .catch(err => console.log(err))

var app = express();


app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('view engine', 'ejs'); // set up ejs for templating
app.use(session({ secret: 'SECRET' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session
;
// app.use(express.static(path.join(__dirname, 'public')));

require('./config/passport')(passport);
require('./routes/routes.js')(app, passport);
app.use('/', routes);
app.listen(port);



module.exports = app;

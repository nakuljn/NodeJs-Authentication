var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var User            = require('../models/user.js');

module.exports = function(app, passport) {

  app.get('/', function(req, res) {
      res.render('index.ejs'); 
  });

  app.get('/login', function(req, res) {

      res.render('login.ejs', { message: req.flash('loginMessage') }); 
  });

 
  app.get('/signup', function(req, res) {

      res.render('signup.ejs', { message: req.flash('signupMessage') });
  });

  app.get('/reset', function(req, res) {

    res.render('reset.ejs', { message: req.flash('resetMessage') });
  });


  app.get('/profile', isLoggedIn, function(req, res) {
      res.render('profile.ejs', {
          user : req.user 
      });
  });

  app.get('/forgot', (req, res, next) => {
  res.setHeader('Content-type', 'text/html');
  res.end(templates.layout(`
    ${templates.error(req.flash())}
    ${templates.forgotPassword()}
  `));
});

app.post('/forgot', async (req, res, next) => {
  const token = (await promisify(crypto.randomBytes)(20)).toString('hex');
  const user = users.find(u => u.email === req.body.email);

  if (!user) {
    req.flash('error', 'No account with that email address exists.');
    return res.redirect('/forgot');
  }

  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000;

  const resetEmail = {
    to: user.email,
    from: 'passwordreset@example.com',
    subject: 'Node.js Password Reset',
    text: `
      You are receiving this because you (or someone else) have requested the reset of the password for your account.
      Please click on the following link, or paste this into your browser to complete the process:
      http://${req.headers.host}/reset/${token}
      If you did not request this, please ignore this email and your password will remain unchanged.
    `,
  };

  await transport.sendMail(resetEmail);
  req.flash('info', `An e-mail has been sent to ${user.email} with further instructions.`);

  res.redirect('/forgot');
});

  app.get('/forgot', function(req, res) {
    res.render('forgot.ejs', {
      user: req.user,
      message: req.flash('resetMessage')
    });
  });

  app.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport('SMTP', {
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.passkey
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'nakuljain20@gmail.com',
          subject: 'Node.js Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
  });
  
  app.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {
        user: req.user
      });
    });
  });

  app.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
  
          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;
  
          user.save(function(err) {
            req.logIn(user, function(err) {
              done(err, user);
            });
          });
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport('SMTP', {
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.passkey
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'nakuljain20@gmail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/');
    });
  });

  app.get('/logout', function(req, res) {
      req.logout();
      res.redirect('/');
  });

  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/signup', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
  }));

  app.post('/login', passport.authenticate('local-login', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/login', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
  }));
}

function isLoggedIn(req, res, next) {
 
  if (req.isAuthenticated())
      return next();

  res.redirect('/');
}
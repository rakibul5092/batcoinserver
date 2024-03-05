var User = require("./models.js");
var controller = require("./controllers");
var config = require("../../config");
var bcrypt = require("bcryptjs"),
  SALT_WORK_FACTOR = 5,
  MAX_LOGIN_ATTEMPTS = 5,
  LOCK_TIME = 2 * 60 * 60 * 1000,
  jwt = require("jsonwebtoken");
var otpGenerator = require("otp-generator");
var email = require("../email/controllers");

const authorize = require("../../middlewares/auth");
const emitModuleChangeEvent = require("../../middlewares/moduleChange");

emitModuleChangeEvent(controller, "user");

function verifyJwt (token) {
  let decoded = jwt.verify(token, config[process.env.MODE].JWT_SECRET);
  return decoded ? (decoded.exp * 1000 > Date.now() ? decoded : false) : false;
}

function sendOTPEmail(user, responsePayload, res) {
  const otpCode = otpGenerator.generate(config[process.env.MODE].OTP_LENGTH, {
    lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false
  });
  user.otp.code = otpCode;
  const expiresIn = Date.now() + config[process.env.MODE].OTP_EXPIRES_IN;
  user.otp.expiration_timestamp = expiresIn;
  user.otp.otpVerified = false;

  let mailView = {
      username: user.first_name,
      email: user.email,
      otp: otpCode,
      url: "https://batcoin.com",
      batcoin: "Batcoin.com"
  }
  
  user.save(function (updateError, updatedUser){
      if(updateError){
          return res.status(500).send(updateError);
      }
      email.sendOTPEmail(user.email, mailView);
      if(responsePayload.user) responsePayload.user.otp.code = "####";
      return res.status(200).send(responsePayload);
  });
}

// Register
controller.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, email, role } = req.body;
    if (!(email && first_name && last_name)) {
      res.send({
        success: false,
        error: "All input is required",
      });
    }

    const oldUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (oldUser) {
      res.status(422).send({
        success: false,
        error: "User Already Exist. Please Login",
      });
    }
    const user = await User.create({
      first_name,
      last_name,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      role,
    });

    // Create token
    const token = jwt.sign(
      {
        user_id: user._id,
        email,
      },
      config[process.env.MODE].JWT_SECRET,
      {
        expiresIn: config[process.env.MODE].JWT_EXPIRES_IN,
      }
    );

    // save user token
    user.token = token;
    // Send the verification email to the user
    sendVerificationMail(req, res);
  } catch (err) {
    if(res.headersSent) return;
    res.status(500).send({
      success: false,
      error: err,
    });
  }
});

// Login
controller.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!(email && password)) {
      return res.send({
        success: false,
        error: "Invalid Email/Password Combination",
      });
    }

    const user = await User.findOne({
      email,
    }).populate("role");

    if (user && (await bcrypt.compare(password, user.password))) {
      if (user.isDeleted || user.deleted) {
        return res.send({
          success: false,
          error: "The username and password were not recognized",
        });
      }

      if (user.active) {
        const expiresIn = config[process.env.MODE].JWT_EXPIRES_IN;
        const token = jwt.sign(
          {
            user_id: user._id,
            email,
          },
          config[process.env.MODE].JWT_SECRET,
          {
            expiresIn: expiresIn,
          }
        );
        
        let isOtpAuth = false;
        let responsePayload = {
            success: true,
            user: user,
            idToken: token,
            expiresIn: expiresIn
        }

        if(user.otp.isMFASet){
            isOtpAuth = true;
            responsePayload.requireOTP = isOtpAuth;
            sendOTPEmail(user, responsePayload, res);
            return;
        }

        responsePayload.requireOTP = isOtpAuth;
        res.status(200).send(responsePayload);
      } else if (!user.is_email_verified) {
        return res.send({
          success: false,
          error: "Your email is not verified. Please verify your email first.",
        });
      } else {
        return res.send({
          success: false,
          error: "Your account is not active. Please contact the adminstrator.",
        });
      }
    } else {
      return res.send({
        success: false,
        error: "Invalid Email/Password Combination",
      });
    }
  } catch (err) {
    return res.send({
      success: false,
      error: "Internal Server Error",
    });
  }
});

/**
 * controller to resend an unique code
 * @param  {Object} req  Request Object
 * @param  {Object} res  Response object
 */
controller.post("/resendVerifyEmail", function (req, res) {
  sendVerificationMail(req, res);
});

/**
 * Function to send unique code to user for verifying mail
 * @param  {Object} req  Request Object
 * @param  {Object} res  Response object
 */
function sendVerificationMail(req, res) {
  User.findOne({
    email: req.body.email,
  })
    .select("+password")
    .exec(function (userFetchError, fetchedUser) {
      // return if error in fetching user details
      if (userFetchError) {
        res.status(500).send(userFetchError);
        return;
      }
      if (fetchedUser) {
        var userId = fetchedUser._id;
        if (fetchedUser.is_email_verified) {
          res.json({
            success: false,
            info: "Email is already verified",
          });
          return;
        } else {
          var randomstring = require("randomstring");
          var code = randomstring.generate({
            length: 12,
            readable: true,
            capitalization: "lowercase",
          });

          var currentTimestamp = Date.now();
          fetchedUser.email_verification = {
            code: code,
            expiration_timestamp:
              currentTimestamp +
              config[process.env.MODE].EMAIL_VERIFICATION_CODE_EXPIRES_IN,
          };
          fetchedUser.reset_password = {
            code: code,
            time_stamp: currentTimestamp,
          };

          fetchedUser.save(function (userUpdateError, updatedUser) {
            console.log(userUpdateError, updatedUser);
            if (userUpdateError) {
              res.status(500).send(userUpdateError);
              return;
            }

            email.verifyEmail(
              fetchedUser.email,
              code,
              userId,
              fetchedUser.first_name,
              null,
              req.language
            );
            res.status(200).json({
              success: true,
              info: "Verification email has been resent",
              code: fetchedUser.email_verification.code
            });
          });
        }
      } else {
        res.json({
          success: false,
          info: "No User found in our records",
        });
      }
    });
}

/**
 * controller to verify an unique code
 * @param  {Object} req  Request Object
 * @param  {Object} res  Response object
 */
controller.get("/email_exists", authorize, function(req, res) {
  const email = req.query.email;
  if(!email){
    return res.status(422).send({
      success: false,
      error: 'Email is required'
    });
  };

   const user = User.findOne({
    email: email.toLowerCase(),
  }).exec(function(err, user){  
    if(err){
      console.log('email validation error: ', {err})
      return res.status(500).send({message: 'validation failed'});
    }
    return res.json({ email_exists : user ? true: false });
  
  }) ;
});

controller.get("/:userId/verify_email/:uniqueCode", function (req, res) {
  var uniqueCode = req.params.uniqueCode;
  var userId = req.params.userId;
  User.findOne(
    {
      _id: userId,
    },
    function (userFetchError, fetchedUser) {
      // returns if error
      if (userFetchError) {
        res.status(500).send(userFetchError);
        return;
      }

      // returns if no user
      if (!fetchedUser) {
        res.status(404).send({
          success: false,
          info: "NO_USER_FOUND_WITH_GIVEN_ID",
        });
        return;
      }

      // return error if user is already verified
      if (fetchedUser.is_email_verified) {
        res.status(400).send({
          success: true,
          info: "USER_ALREADY_VERIFIED",
        });
        return;
      }

      //check if email verification code has expired
      if (Date.now() >= fetchedUser.email_verification.expiration_timestamp) {
        res.status(400).send({
          success: false,
          info: "EMAIL_VERIFICATION_CODE_EXPIRED",
        });
        return;
      }

      // checks for the unique code
      var secretCode = fetchedUser.email_verification.code;
      if (uniqueCode != secretCode) {
        res.status(401).send({
          success: false,
          info: "WRONG_UNIQUE_CODE_ENTERED",
        });
        return;
      }

      fetchedUser.is_email_verified = true;
      fetchedUser.save(function (userUpdateError, updatedUser) {
        if (userUpdateError) {
          res.status(500).send(userUpdateError);
          return;
        }

        res.status(200).json({
          success: true,
          info: "User verified successfully",
        });
      });
    }
  );
});

controller.post("/:id/change_password", authorize, function (req, res) {
  User.findOne({
    _id: req.params.id,
  })
    .select("+password")
    .exec(function (err, user) {
      if (user) {
        user.comparePassword(req.body.old_password, function (err, correct) {
          if (correct) {
            user.password = req.body.new_password;
            user.save(function (err) {
              if (err) {
                res.json({
                  success: 0,
                });
              } else {
                res.json({
                  success: 1,
                });
              }
            });
          } else {
            res.json({
              success: 0,
            });
          }
        });
      } else {
        res.json({
          success: 0,
        });
      }
    });
});

controller.post("/forgot_password", function (req, res) {
  User.findOne({
    email: req.body.email,
  })
    .select("+password")
    .exec(function (err, owner) {
      if (owner) {
        var randomstring = require("randomstring");
        var code = randomstring.generate({
          length: 12,
          readable: true,
          capitalization: "lowercase",
        });
        owner.reset_password = {
          code: code,
          time_stamp: Date.now(),
        };

        owner.save(function (err) {
          if (err) {
            res.status(500).send(err);
            return;
          } else {
            email.sendResendPasswordEmail(
              req.body.email,
              code,
              owner.first_name,
              req.language
            );
            res.json({
              success: true,
              info: "Reset password instructions will be sent on the registered mail address",
            });
          }
        });
      } else {
        res.json({
          success: false,
          info: "No User found in our records",
        });
      }
    });
});

controller.post("/reset_password", async (req, res) => {
  User.findOne(
    {
      "reset_password.code": req.body.code,
    },
    async (err, owner) => {
      if (owner) {
        var moment = require("moment");
        var expiry_time = moment(owner.reset_password.time_stamp).add(
          1,
          "hours"
        );
        if (expiry_time.isAfter(moment())) {
          encryptedPassword = await bcrypt.hash(req.body.password, 10);

          owner.password = encryptedPassword;
          owner.reset_password = {};
          owner.save(function (err) {
            if (!err) {
              res.json({
                success: true,
                info: "Password changed successfuly",
              });
            } else {
              res.json({
                success: false,
                info: "Failed to change password",
              });
            }
          });
        } else {
          res.json({
            success: false,
            info: "Token expired, please reset password again and try within 1 hour.",
          });
        }
      } else {
        res.json({
          success: false,
          info: "Invalid reset code provided, please reset password again",
        });
      }
    }
  );
});
controller.post("/sendInvite", async (req, res) => {});

controller.get("/validate_jwt", (req, res) => {
  let token = req.headers["x-access-token"] || req.headers["authorization"];
  if (!token) {
    return res.status(403).send("A token is required for validation");
  }
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }
  try {
    const decoded = jwt.verify(token, config[process.env.MODE].JWT_SECRET);
    const dateNow = new Date();
    if (!decoded || decoded.exp < dateNow.getTime() / 1000) {
      return res.json({ success: false });
    } else {
      return res.json({ success: true });
    }
  } catch (err) {
    return res.json({ success: false });
  }
});



controller.request("get", authorize);
controller.request("put", authorize);
controller.request("post", authorize);
controller.request("delete", authorize);

controller.request("delete", function (req, res, next) {
  if (req.params.id === req.user.user_id) {
    return res.status(422).send('SNACKBAR.USER_CANNOT_DELETE_HIMSELF');
  }
  if (req.params.id) {
    next();
    var user = req.user;
    if (user) {
      req.body.deleted = true;
      req.body.deleted_by = user.user_id;
      req.body.deleted_on = new Date().getTime();
    }
  } else {
    next(new Error("Invalid delete request"));
  }
});

controller.get("/migrate/add-email-verfication-fields", async(req, res) => {
  User.updateMany(
    {
      email_verification: {$exists: false},
    }, 
    {
      $set: {
        email_verification: {
          "code": "15z2qc3sapkt",
          "expiration_timestamp": Date.now()
        }
      }
    }
  ).then(result => {
    return res.status(200).json({
      success: true,
      message: "email verification added for batcoin admin",
    });
  }).catch(err => res.status(500).json({success: false, message: "error there"}))
});

controller.get("/mfa-auth", (req, res) => {
  let token = req.headers["auth-token"];
  let otp = req.headers["auth-otp"];
  let decoded = verifyJwt(token);
  if(!decoded){
      return res.status(403).send({
          success: false,
          error: "Invalid token"
      });
  }else{
      User.findOne({_id: decoded.user_id}, function (userFetchError, fetchedUser) {
          if(userFetchError) return res.status(400).send(userFetchError);

          if(fetchedUser.otp.expiration_timestamp <= Date.now()) return res.status(400).send({
              success: false,
              message: "OTP_HAS_EXPIRED"
          });

          if(fetchedUser.otp.code !== otp) return res.status(422).send({
              success: false,
              message: "OTP_IS_INVALID"
          });

          //All conditions are met
          fetchedUser.otp.otpVerified = true;
          fetchedUser.save(function (userUpdateError, updatedUser){
              if(userUpdateError) return res.status(500).send(userUpdateError);

              res.status(200).send({
                  success: true
              })
          })
      })
  }
});

controller.get("/resend_otp", (req, res) => {
  let token = req.headers["auth-token"];
  let decoded = verifyJwt(token);
  if(!decoded){
      return res.status(403).send({
          success: false,
          error: "Invalid token"
      });
  }

  User.findOne({_id: decoded.user_id}, function (userFetchError, fetchedUser){
      if(userFetchError) return res.status(400).send(userFetchError);

      let responsePayload = {success: true}
      sendOTPEmail(fetchedUser, responsePayload, res);
  });
})

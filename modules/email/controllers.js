"use strict";
var config = require("../../config");
process.env.MODE = process.env.MODE || "development";
const Mustache = require("mustache");
var fs = require("fs");
var app = require("express")();
var SENDER_EMAIL_ADDRESS = config[process.env.MODE].sesCredentials.email;
var DOMAIN = config.getUrl(app);
var AWS = require("aws-sdk");
var node_ses = require("node-ses");
const i18n = require("i18n");
// // Amazon SES configuration
// const SESConfig = {
//     apiVersion: '2010-12-01',
//     accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
//     region: process.env.AWS_SES_REGION
//   };
var client = node_ses.createClient(config[process.env.MODE].sesCredentials);

function sendEmail(to, subject, output) {
  var params = {
    Destination: {
      /* required */
      CcAddresses: [to],
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: output,
        },
        Text: {
          Charset: "UTF-8",
          Data: output,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: SENDER_EMAIL_ADDRESS,
    ReplyToAddresses: [SENDER_EMAIL_ADDRESS],
  };
  var sendPromise = new AWS.SES({
    apiVersion: "2010-12-01",
  })
    .sendEmail(params)
    .promise();
  console.log(params);
  sendPromise
    .then(function (data) {
      console.log(data.MessageId);
    })
    .catch(function (err) {
      console.error(err, err.stack);
    });
}

function translate(templateName) {
  return function () {
    return function (name) {
      return i18n.__(templateName)[name];
    };
  };
}

module.exports = {
  /**
   * Method to send verification email to a user
   * @param  {String} to               E-Mail ID of the user to whom the verification code is to be sent
   * @param  {String} verificationCode Random Unique code for the user
   */
  sendVerificationEmail: function (
    to,
    verificationCode,
    ownerId,
    username,
    password
  ) {
    // setup email data with unicode symbols
    var urlToBeSent =
      config[process.env.MODE].frontend_url +
      "/auth/verify_email/" +
      ownerId +
      "/" +
      verificationCode;
    fs.readFile(
      __dirname + "/registration-template.html",
      "utf8",
      function (err, contents) {
        var view = {
          username: username,
          url: urlToBeSent,
          password: password,
          t: translate("REGISTRATION_EMAIL"),
        };
        var output = Mustache.render(contents, view);
        
        sendEmail(to, i18n.__("REGISTRATION_EMAIL")['EMAIL_VERIFICATION'], output);
      }
    );
  },
  sendResendPasswordEmail: function (to, uniqueCode, username) {
    var urlToBeSent =
      config[process.env.MODE].frontend_url +
      "/auth/reset_password/" +
      uniqueCode;
    fs.readFile(
      __dirname + "/confirm-password.html",
      "utf8",
      function (err, contents) {
        var view = {
          username: username,
          url: urlToBeSent,
          t: translate("CONFIRM_PASSWORD_EMAIL"),
        };
        var output = Mustache.render(contents, view);
        sendEmail(to, "Batcoin - "+ i18n.__("CONFIRM_PASSWORD_EMAIL")['RESET_PASSWORD'], output);
      }
    );
  },
  verifyEmail: function (to, verificationCode, ownerId, username, password) {
    var urlToBeSent =
      config[process.env.MODE].frontend_url +
      "/auth/verify_email/" +
      ownerId +
      "/" +
      verificationCode;
    fs.readFile(
      __dirname + "/verify-email.html",
      "utf8",
      function (err, contents) {
        var view = {
          username: username,
          url: urlToBeSent,
          t: translate("VERIFY_EMAIL"),
        };
        var output = Mustache.render(contents, view);
        sendEmail(to,  i18n.__("VERIFY_EMAIL")['VERIFY_EMAIL'], output);
      }
    );
  },
  sendOrderEmail: function (
    to,
    orderId,
    total,
    selectedProducts,
    username,
    tax,
    subtotal,
    shipmentRate,
    tracker
  ) {
    fs.readFile(
      __dirname + "/order-email.html",
      "utf8",
      function (err, contents) {
        var view = {
          selectedProducts,
          total,
          username,
          tax,
          subtotal,
          orderId,
          shipmentRate,
          tracker,
          t: translate("ORDER_EMAIL"),
          currentLocale: i18n.getLocale(),
          getProductTitle: function () {
            return Object.values(this)[Object.keys(this).indexOf(i18n.getLocale())];
          }
        };
        var output = Mustache.render(contents, view);
        sendEmail(to, "Batcoin Order Confirmation", output);
      }
    );
  },

  sendOTPEmail: function (to, view) {
    fs.readFile(__dirname + '/verify-mfa-email.html', 'utf8', function (err, contents){
        view.t = translate("MFA_EMAIL");
        var output = Mustache.render(contents, view);
        sendEmail(to, i18n.__("MFA_EMAIL")["OTP_VERIFICATION_CODE"], output);
    })
  }
};

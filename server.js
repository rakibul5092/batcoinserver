var express = require("express"),
  path = require("path"),
  bodyParser = require("body-parser"),
  fs = require("fs"),
  mongoose = require("mongoose"),
  http = require("http"),
  config = require("./config"),
  baucis = require("baucis"),
  cors = require("cors"),
  async = require("async");
const i18n = require("i18n");
const Mustache = require("mustache");
const { verifyEmail } = require("./modules/email/controllers");

i18n.configure({
  locales: ["en", "es", "fr"],
  defaultLocale: 'en',
  directory: path.join(__dirname, "locales"),
});

process.env.MODE = process.env.MODE || "development";
var port = process.env.PORT || config[process.env.MODE].port;
mongoose.connect(
  process.env.MONGODB_URI || config[process.env.MODE].database_url,
  { useNewUrlParser: true, useUnifiedTopology: true }
);

var app = express();
var httpServer = http.createServer(app);
var io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
  },
});

var sockets_buckets = [];

function getSocketBucketByUserID(user_id) {
  if (Array.isArray(sockets_buckets) && user_id) {
    var socket_bucket = sockets_buckets.find(function (socket_bucket) {
      return socket_bucket._id.toString() === user_id.toString();
    });
    return socket_bucket;
  } else {
    sockets_buckets = [];
  }
}

function getSocketBucketBySocketID(socket_id) {
  var socket_bucket = sockets_buckets.find(function (socket_bucket) {
    var index = socket_bucket.sockets.indexOf(socket_id);
    if (index > -1) {
      return true;
    }
  });
  return socket_bucket;
}

io.on("connection", (socket) => {
  let previousId;

  const safeJoin = (currentId) => {
    socket.leave(previousId);
    socket.join(currentId, () =>
      console.log(`Socket ${socket.id} joined room ${currentId}`)
    );
    previousId = currentId;
  };
  socket.on("disconnect", () => {
    console.log("disconnected", socket.id);
    sockets_buckets.find(function (socket_bucket) {
      var index = socket_bucket.sockets.indexOf(socket.id);
      if (index > -1) {
        socket_bucket.sockets.splice(index, 1);
        return true;
      }
    });
  });
  socket.on("get_counts", (payload) => {
    console.log("get_counts", socket.id);
    var Notification = mongoose.model("notification_messages");
    Notification.count(
      { $and: [{ to: payload._id }, { read: false }] },
      function (err, count) {
        io.to(socket.id).emit("counts", { notifications: count });
      }
    );
  });
  socket.on("verified_user", async (payload) => {
    let justVerifiedUser = await mongoose.model("user").findById(payload.id);
    socket.broadcast.emit("userVerified", justVerifiedUser);
  });
  socket.on("register", (payload) => {
    console.log("registered", payload);
    var socketBucket = getSocketBucketByUserID(payload._id);
    if (!socketBucket) {
      socketBucket = {
        _id: payload._id,
        rooms: [],
        sockets: [socket.id],
      };
      sockets_buckets.push(socketBucket);
    } else {
      if (!Array.isArray(socketBucket.sockets)) {
        socketBucket.sockets = [];
      }
      socketBucket.sockets.push(socket.id);
    }
    var Notification = mongoose.model("notification_messages");
    Notification.count(
      { $and: [{ to: payload._id }, { read: false }] },
      function (err, count) {
        io.to(socket.id).emit("counts", { notifications: count });
      }
    );
  });
});

process.on("notification", async (payload) => {
  var Notification = mongoose.model("notification_messages");
  delete payload._id;
  mongoose
    .model("user")
    .find({})
    .populate({
      path: "role",
    })
    .exec(async (err, users) => {
      for (const user of users) {
        payload.to = user._id;
        let notification = await Notification.create(payload);
        var recipientSocket = getSocketBucketByUserID(payload.to);
        if (recipientSocket && Array.isArray(recipientSocket.sockets)) {
          recipientSocket.sockets.forEach((socket_id) => {
            Notification.count(
              { $and: [{ to: payload.to.toString() }, { read: false }] },
              function (err, count) {
                io.to(socket_id).emit("counts", { notifications: count });
              }
            );
            io.to(socket_id).emit("notification", notification);
          });
        }
      }
    });
});

process.on("moduleChange", async (payload) => io.emit("moduleChange", payload));

app.use(cors());
app.options("*", cors());
app.use((req, res, next) => {
  i18n.setLocale(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  next();
});

app.use(function (req, res, next) {
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, count, model"
  );
  res.header(
    "access-control-expose-headers",
    "Origin, X-Requested-With, Content-Type, Accept, count, model"
  );
  next();
});

app.set("view engine", "ejs");

var router = express.Router();

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

app.use(bodyParser.json({ limit: "50mb" }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

baucis.Controller.decorators(function (option, protect) {
  var controller = this;
  controller.request("post", function (req, res, next) {
    console.log(req.body);
    if (req.body._id == null) {
      delete req.body._id;
    }
    next();
  });
  controller.query("collection", "*", function (request, response, next) {
    //if (controller.relations() === false) return next();

    if (request.method !== "GET") return next();
    if (!request.query.limit) return next();

    function goNext() {
      controller
        .model()
        .count(request.baucis.conditions, function (error, count) {
          if (error) return next(error);
          response.set("model", controller.model().modelName);
          response.set("count", count);
          next();
        });
    }
    goNext();
  });
});

require("./modules/products/main.js");
require("./modules/orders/main.js");
require("./modules/order_status/main.js");
require("./modules/contact_queries/main.js");
require("./modules/user/main.js");
require("./modules/user_roles/main.js");
require("./modules/notification_messages/main.js");
require("./modules/third_party_notifications/main.js");
require("./modules/email/main.js");
require("./modules/cms/main.js");

app.use("/api/v1", baucis());
app.use(
  "/api/v1/shipping/address",
  require("./modules/shipping/routes/addressRoute.js")
);
app.use(
  "/api/v1/shipping/trackers",
  require("./modules/shipping/routes/trackersRoute.js")
);
app.use(
  "/api/v1/shipping/shipments",
  require("./modules/shipping/routes/shipmentRoute.js")
);
app.use("/api/v1/s3", require("./modules/s3/filesRoute"));

////////////////////////////////

app.all("/*", function (req, res, next) {
  if (req.url.indexOf("api") > -1) {
    res.sendStatus(404);
  } else if (req.url.indexOf("api") == "/#/") {
    res.sendStatus(404);
  }
  //   else {
  //       res.sendFile('index.html', { root: publicweb });
  //   }
});

app.use(function (req, res) {
  //res.redirect('/index.html', { root: __dirname+'/www-web' });
  res.sendStatus(404);
});

httpServer.listen(port);
console.log("Batcoin Running on Port " + port);

if (process.env.MODE === "production") {
  process.on("uncaughtException", function (err) {
    console.error(err);
    console.log("Node NOT Exiting...");
  });
}

////////////////////////////////////////////////

console.log("Batcoin Running on port " + port);

if(process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const User = require("./models/user.js");
const localStrategy = require("passport-local");
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const MongoStore = require('connect-mongo');

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.engine("ejs", ejsMate);

const store = MongoStore.create({
  mongoUrl : process.env.ATLASDB,
  touchAfter: 24 * 3600, // time in seconds
  crypto:{
    secret : "monkeydluffy"
  }
})

store.on("error", function(e) {
  console.log("Session Store Error", e);
});

const sessionOptions = {
  store,
  secret : "monkeydluffy",
  resave: false,
  saveUninitialized: true,
  cookie : {
    httpOnly: true,
    // secure: true, // Uncomment this line if using HTTPS
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
  next();
});


// Connecting to MongoDB
// const MONGO_URL = process.env.ATLASDB;
const dbUrl = process.env.ATLASDB;
const port = 8080;

async function main() {
  await mongoose.connect(dbUrl);
}

main()
  .then(() => {
    console.log("DB Connected");
  })
  .catch((err) => {
    console.log(err);
  });//Connecting to MongoDB

// Listings Routes
app.use("/listing", listingRouter);

// Reviews Routes
app.use("/listing/:id/reviews", reviewRouter);

app.get("/privacy",(req,res)=>{
  res.render("footer/privacy")
})

app.get("/terms", (req, res) => {
  res.render("footer/terms");
});

// User Routes
app.use("/", userRouter);


app.use((req, res, next) => {
  next(new ExpressError(404, "Page not Found!"));
});

app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went wrong!!!" } = err;
  res.status(statusCode).render("listings/error", { message });
});

app.listen(port, () => {
  console.log("Server connected to port no. ", port);
});

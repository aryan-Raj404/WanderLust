const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });
const path = require("path");

//show all listings
router.get(
  "/",
  wrapAsync(async (req, res) => {
    let listings = await Listing.find({});
    res.render("listings/listing", { listings });
  })
);

// Add a new listing
router.get("/add", isLoggedIn, (req, res) => {
  res.render("listings/add");
});

// Edit a listing
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listing");
    }
    let originalUrl = listing.image.url;
    originalUrl = originalUrl.replace(
      "/upload",
      "/upload/w_300,c_fill,e_blur:300"
    );
    console.log(originalUrl);
    res.render("listings/edit", { listing, originalUrl });
  })
);

router.get(
  "/filter/:filter",
  wrapAsync(async (req, res) => {
    let { filter } = req.params;
    let listings = await Listing.find({});
    console.log(filter);
    res.render("listings/filter", { listings , filter });
  })
);

// Show a single listing
router.get(
  "/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id)
      .populate({ path: "reviews", populate: { path: "author" } })
      .populate("owner");
    if (!listing) {
      req.flash("error", "Listing not found!");
      res.redirect("/listing");
      return;
    }
    console.log(listing);
    res.render("listings/singleListing", { listing });
  })
);

// Create a new listing
router.post(
  "/",
  isLoggedIn,
  upload.single("listing[image]"),
  validateListing,
  wrapAsync(async (req, res, next) => {
    let location = req.body.listing.location;
    let response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${location}&limit=1&key=facb37cb2fe64b6dbe8537def46e854b`
    );
    let data = await response.json();
    let coordinates = data.results[0].geometry;
    let url = req.file.path;
    let filename = req.file.filename;
    let listing = new Listing(req.body.listing);
    listing.owner = req.user._id;
    listing.image = { url, filename };
    listing.geometry = [coordinates.lng, coordinates.lat]; // Store longitude and latitude
    console.log(listing);
    await listing.save();
    req.flash("success", "New listing created successfully!");
    console.log(req.body.listing);
    res.redirect("/listing");
  })
);

// Update a listing
router.put(
  "/:id",
  isLoggedIn,
  isOwner,
  upload.single("listing[image]"),
  validateListing,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndUpdate(id, req.body.listing);
    if (req.file) {
      let url = req.file.path;
      let filename = req.file.filename;
      await Listing.findByIdAndUpdate(id, { image: { url, filename } });
    }
    req.flash("success", "Listing updated successfully!");
    res.redirect(`/listing/${id}`);
  })
);

// delete a listing
router.delete(
  "/:id",
  isOwner,
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted successfully!");
    res.redirect("/listing");
  })
);

module.exports = router;

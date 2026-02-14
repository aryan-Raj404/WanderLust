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
  }),
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
    originalUrl = originalUrl.replace("/upload", "/upload/w_300,c_fill,e_blur:300");
    res.render("listings/edit", { listing, originalUrl });
  }),
);

router.get(
  "/filter/:filter",
  wrapAsync(async (req, res) => {
    let { filter } = req.params;
    let listings = await Listing.find({});
    res.render("listings/filter", { listings, filter });
  }),
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
    // debug logs removed

    // If geometry is missing, attempt a server-side geocode using the listing location
    if (!listing.geometry || listing.geometry.length < 2) {
      const location = listing.location || "";
      if (location) {
          try {
          // debug log removed
          // Try OpenCage first (uses MAP_API_KEY env var)
          const openCageKey = process.env.MAP_API_KEY;
          let coords = null;
          if (openCageKey) {
            try {
              const resp = await fetch(
                `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
                  location,
                )}&limit=1&key=${openCageKey}`,
              );
              const d = await resp.json();
              if (
                d &&
                d.results &&
                d.results.length > 0 &&
                d.results[0].geometry
              ) {
                coords = d.results[0].geometry; // {lat, lng}
                // debug log removed
              } else {
                // debug log removed
              }
            } catch (e) {
              console.error("OpenCage geocode error:", e);
            }
          }

          // Fallback: try MapTiler geocoding using `MAP` env var
          if (!coords) {
            const maptilerKey = process.env.MAP;
            if (maptilerKey) {
              try {
                const resp2 = await fetch(
                  `https://api.maptiler.com/geocoding/${encodeURIComponent(
                    location,
                  )}.json?limit=1&key=${maptilerKey}`,
                );
                const d2 = await resp2.json();
                if (
                  d2 &&
                  d2.features &&
                  d2.features.length > 0 &&
                  d2.features[0].geometry &&
                  d2.features[0].geometry.coordinates
                ) {
                  const [lng, lat] = d2.features[0].geometry.coordinates;
                  coords = { lng, lat };
                  // debug log removed
                } else {
                  // debug log removed
                }
              } catch (e) {
                console.error("MapTiler geocode error:", e);
              }
            }
          }

            if (coords) {
            listing.geometry = [coords.lng, coords.lat];
            await listing.save();
          } else {
            req.flash(
              "warning",
              "Map coordinates not available for this listing.",
            );
          }
        } catch (e) {
          console.error("Geocoding overall failed:", e);
          req.flash("warning", "Unable to fetch map coordinates at this time.");
        }
      }
    }

    res.render("listings/singleListing", { listing });
  }),
);

// Create a new listing
router.post(
  "/",
  isLoggedIn,
  upload.single("listing[image]"),
  validateListing,
  wrapAsync(async (req, res, next) => {
    let location = req.body.listing.location;
    // Use env var for OpenCage key; fallback to MapTiler if needed
    let coordinates = null;
    const openCageKey = process.env.MAP_API_KEY;
    if (openCageKey) {
      try {
        const response = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(location)}&limit=1&key=${openCageKey}`,
        );
        const data = await response.json();
        if (
          data &&
          data.results &&
          data.results.length > 0 &&
          data.results[0].geometry
        ) {
          coordinates = data.results[0].geometry;
        }
      } catch (e) {
        console.error("OpenCage geocode error (create):", e);
      }
    }
    if (!coordinates) {
      const maptilerKey = process.env.MAP;
      if (maptilerKey) {
        try {
          const resp2 = await fetch(
            `https://api.maptiler.com/geocoding/${encodeURIComponent(location)}.json?limit=1&key=${maptilerKey}`,
          );
          const d2 = await resp2.json();
          if (
            d2 &&
            d2.features &&
            d2.features.length > 0 &&
            d2.features[0].geometry &&
            d2.features[0].geometry.coordinates
          ) {
            const [lng, lat] = d2.features[0].geometry.coordinates;
            coordinates = { lng, lat };
          }
        } catch (e) {
          console.error("MapTiler geocode error (create):", e);
        }
      }
    }
    if (!coordinates) {
      // Don't block creation if geocoding fails. Save listing without geometry
      // and inform the user that the map will be disabled for this listing.
      let url = req.file.path;
      let filename = req.file.filename;
      let listing = new Listing(req.body.listing);
      listing.owner = req.user._id;
      listing.image = { url, filename };
      await listing.save();
      req.flash(
        "warning",
        "Location not found. Listing created without map coordinates.",
      );
      return res.redirect(`/listing/${listing._id}`);
    }
    let url = req.file.path;
    let filename = req.file.filename;
    let listing = new Listing(req.body.listing);
    listing.owner = req.user._id;
    listing.image = { url, filename };
    listing.geometry = [coordinates.lng, coordinates.lat]; // Store longitude and latitude
    // debug logs removed
    await listing.save();
    req.flash("success", "New listing created successfully!");
    // debug logs removed
    res.redirect("/listing");
  }),
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
  }),
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
  }),
);

module.exports = router;

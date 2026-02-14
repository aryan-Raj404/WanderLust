if (typeof showMap === "undefined" || !showMap) {
  // map disabled for this listing
} else {
  const key = mapApi;
  const attribution = new ol.control.Attribution({
    collapsible: false,
  });

  const source = new ol.source.TileJSON({
    url: `https://api.maptiler.com/maps/streets-v2/tiles.json?key=${key}`,
    tileSize: 512,
    crossOrigin: "anonymous",
  });

  const map = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: source,
      }),
    ],
    // `ol.control.defaults` is not available in this OL build in some cases;
    // add our attribution control after creating the map instead of using defaults().
    target: "map",
    view: new ol.View({
      constrainResolution: true,
      center: ol.proj.fromLonLat([Number(lon), Number(lat)]),
      zoom: 10,
    }),
  });

  // Add attribution control explicitly
  try {
    map.addControl(attribution);
  } catch (e) {
    console.warn("Could not add attribution control:", e);
  }

  const layer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: [
        new ol.Feature({
          geometry: new ol.geom.Point(
            ol.proj.fromLonLat([Number(lon), Number(lat)]),
          ),
        }),
      ],
    }),
    style: new ol.style.Style({
      image: new ol.style.Icon({
        anchor: [0.5, 1],
        crossOrigin: "anonymous",
        src: "https://cdn-icons-png.flaticon.com/32/252/252025.png",
      }),
    }),
  });
  map.addLayer(layer);
}

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
  controls: ol.control.defaults
    .defaults({ attribution: false })
    .extend([attribution]),
  target: "map",
  view: new ol.View({
    constrainResolution: true,
    center: ol.proj.fromLonLat([lon, lat]),
    zoom: 10,
  }),
});

const layer = new ol.layer.Vector({
  source: new ol.source.Vector({
    features: [
      new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
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

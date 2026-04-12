const PRODUCTS = [
  {
    "partname": "GCCollectionTM",
    "description": "Our own range of ready-made repeating pattrns.",
    "designType": "Patterns",
    "image": "../assets/E-cat/Product/GC/GCCOLLECTION.png",
  },

  {
    "partname": "Custom-made",
    "description": "Stop searching and start creating: Your custom masterpiece is only moments away.",
    "designType": "Patterns",
    "image": "../assets/E-cat/Product/NOE/560000.webp",
  },

  {
    "partname": "GCCollectionTM",
    "description": "Our own range of ready-made repeating pattrns",
    "designType": "Patterns",
    "image": "../assets/E-cat/Product/NOE/560000.webp",
  },

  {
    "partname": "GCCollectionTM",
    "description": "Our own range of ready-made repeating pattrns",
    "designType": "Patterns",
    "image": "../assets/E-cat/Product/NOE/560000.webp",
  },
];

function getModalMediaHTML(product) {
  const sketchfabId = getSketchfabId(product.link3d);
  const hasImage = !!product.image;
  const has3d = !!sketchfabId;
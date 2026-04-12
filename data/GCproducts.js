const PRODUCTS = [
  {
    "partname": "GCCollectionTM",
    "description": "Our own range of ready-made repeating pattrns.",
    "designType": "Patterns",
    "image":
  },

  {
    "partname": "Custom-made",
    "description": "Stop searching and start creating: Your custom masterpiece is only moments away.",
    "designType": "Patterns",
    "image": ,
  },

  {
    "partname": "GCSmooth",
    "description": "A blank membrane to create a beautiful velevety smooth and even concrete surface without any pattern.",
    "designType": "Patterns",
    "image": ",
  },

  {
    "partname": "GCExpose",
    "description": "Helps provide a fully exposed surface in a safe and enviromentally friendly way.",
    "designType": "Patterns",
    "image": "",
  },
];

function getModalMediaHTML(product) {
  const sketchfabId = getSketchfabId(product.link3d);
  const hasImage = !!product.image;
  const has3d = !!sketchfabId;
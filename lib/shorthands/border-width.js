const directions = require('../directions.js')
const directionalCollapse = require('../directional-collapse.js')
const directionalExpand = require('../directional-expand.js')
const labels = directions.map((direction) => `border-${direction}-width`)

module.exports = {
  expand: directionalExpand(labels),
  collapse: directionalCollapse('border-width', labels)
}

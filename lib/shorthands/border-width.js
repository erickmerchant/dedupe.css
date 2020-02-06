const directions = require('../directions.js')
const directionalCollapse = require('../directional-collapse.js')
const labels = directions.map((direction) => `border-${direction}-width`)

module.exports = {
  collapse: directionalCollapse('border-width', labels)
}

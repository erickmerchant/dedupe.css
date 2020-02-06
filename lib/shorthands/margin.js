const directions = require('../directions.js')
const directionalCollapse = require('../directional-collapse.js')
const labels = directions.map((direction) => `margin-${direction}`)

module.exports = {
  collapse: directionalCollapse('margin', labels)
}

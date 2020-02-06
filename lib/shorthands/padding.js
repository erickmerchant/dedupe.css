const directions = require('../directions.js')
const directionalCollapse = require('../directional-collapse.js')
const labels = directions.map((direction) => `padding-${direction}`)

module.exports = {
  collapse: directionalCollapse('padding', labels)
}

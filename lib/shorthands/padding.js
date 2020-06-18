import directions from '../directions.js'
import directionalCollapse from '../directional-collapse.js'

const labels = directions.map((direction) => `padding-${direction}`)

export default {
  collapse: directionalCollapse('padding', labels)
}

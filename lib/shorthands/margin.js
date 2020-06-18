import directions from '../directions.js'
import directionalCollapse from '../directional-collapse.js'

const labels = directions.map((direction) => `margin-${direction}`)

export default {
  collapse: directionalCollapse('margin', labels)
}

import directions from '../directions.js'
import directionalCollapse from '../directional-collapse.js'

const labels = directions.map((direction) => `border-${direction}-width`)

export default {
  collapse: directionalCollapse('border-width', labels)
}

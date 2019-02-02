<template>
  <div>
    <scene :brain="brain"></scene>
  </div>
</template>

<script>
import brainjs from "brain.js"

import scene from "./components/Scene.vue"

export default {
  name: 'app',
  data () {
    return {
      brain: null
    }
  },
  mounted () {
    const log = console.log
    let brain = this.brain = new brainjs.NeuralNetwork()
    const stats = brain.train([
      { input: [0.1], output: [0] },
      { input: [0.2], output: [0] },
      { input: [0.3], output: [0] }
    ])
    log("Net stats:", stats)

    log(brain.run([0.4]))

    brain.train([
      { input: [0.4], output: [0] },
    ])
    log(brain.run([0.4]))

    brain.train([
      { input: [1.0], output: [0] },
    ])
    log(brain.run([0.4]))

  },
  methods: {
  },
  components: {
    scene
  }
}
</script>

<style>
html {
  background-color: grey;
}

body {
  margin: 0;
}
</style>

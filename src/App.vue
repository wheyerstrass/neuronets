<template>
  <div>
    <div class="net">
      <p><b>net stats</b></p>
      <hr>
      <p>Error: {{ net.error.toFixed(2) }}</p>
      <p>Epochs: {{ epochs }}</p>
    </div>
  </div>
</template>

<script>
import brainjs from "brain.js"
import env from "./environment.js"
import replayMem from "./replay-memory.js"

export default {
  name: 'app',
  data () {
    return {
      net: { error: -1 },
      epochs: 0
    }
  },
  mounted () {
    const ctx = this

    /* setup neural net */
    const config = {
      hiddenLayers: [6],
      activation: "sigmoid"
    }
    const net = new brainjs.NeuralNetwork(config)
    let trainData = [{
      input: {ballX: 0, ballY: 0, playerX: 0, action: 0},
      output: { reward: 100 }
    }]
    net.train(trainData)

    const maxRewardAction = function(state) {
      const { Stay, MoveLeft, MoveRight } = env.actions
      let rewards = []
      rewards[Stay] = net.run({ ...state, action: Stay }).reward
      rewards[MoveLeft] = net.run({ ...state, action: MoveLeft }).reward
      rewards[MoveRight] = net.run({ ...state, action: MoveRight }).reward
      return rewards.indexOf(Math.max(...rewards))
    }
    const randomAction = function() {
      return Math.floor(Math.random() * 3)
    }


    /* mount dom */
    this.$el.appendChild(env.domElement)

    /* starts simulation loop */
    let training = false
    let simulationLoop = function () {
      requestAnimationFrame(simulationLoop)

      const oldState = env.getState()

      /* choose action */
      const actionId = (Math.random() > 0.1) ?
        maxRewardAction(oldState) :
        randomAction()

      const reward = env.simulateStep(actionId)
      const newState = env.getState()

      replayMem.storeExp(oldState, actionId, reward, newState)

      /* train net */
      if (!training) {
        ctx.epochs++
        training = true
        const exp = replayMem.getRandomSampleBatch(10)
        trainData.push(...exp.map(({oldState, action, reward, newState}) => ({
          input: { ...oldState, action },
          output: { reward: reward + 0.95 * maxRewardAction(newState) }
        })))
        net.trainAsync(trainData, {
          iterations: 10000,
          learningRate: 0.1
        })
          .then(res => {
            training = false
            ctx.net = res
            console.log("Done training:", res)
          }).catch(err => console.log(err))
      }
    }
    simulationLoop()

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

.net {
  position: fixed;
  top: 5px;
  right: 5px;
  background-color: whitesmoke;
  padding: 15px;
  border: 1px solid black;
}
</style>

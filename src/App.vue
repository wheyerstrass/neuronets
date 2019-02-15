<template>
  <div>
  </div>
</template>

<script>
import brainjs from "brain.js"
import env from "./environment.js"
import replayMem from "./replay-memory.js"

export default {
  name: 'app',
  mounted () {

    /* setup neural net */
    const config = {
      hiddenLayers: [100],
      activation: "relu"
    }
    const net = new brainjs.NeuralNetworl(config)
    const maxRewardAction = function(state) {
      const { Stay, MoveLeft, MoveRight } = env.actions
      let rewards = []
      rewards[Stay] = net.run({ ...state, action: Stay })
      rewards[MoveLeft] = net.run({ ...state, action: MoveLeft })
      rewards[MoveRight] = net.run({ ...state, action: MoveRight })
      return rewards.indexOf(Math.max(...rewards))
    }
    const randomAction = function() {
      return Math.floor(Math.random()*Object.entries(env.actions).length)
    }


    /* mount dom */
    this.$el.appendChild(env.domElement)

    /* starts simulation loop */
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
      const exp = replayMem.getRandomSampleBatch(10)
      
      /* train net */
      net.train(exp.map(({oldState, action, reward, newState}) => ({
        input: { ...oldState, action },
        output: { reward: reward + 0.95 * maxRewardAction(newState) }
      })))
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
</style>

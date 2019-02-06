<template>
  <div class="scene">
    <div class="debug">
      Explore: {{ explore }} vs. Exploit: {{ exploit }} <br>
      Eps: {{ param.eps }}
    </div>
  </div>
</template>

<script>
import * as THREE from "three"
//import brainjs from "brain.js"

const ww = 400
const wh = 600
//const ww = window.innerWidth * 0.95
//const wh = window.innerHeight * 0.95

export default {
  name: 'scene',
  props: {
    brain: Object
  },
  data () {
    return {
      scene: new THREE.Scene(),
      renderer: new THREE.WebGLRenderer(),
      cam: new THREE.OrthographicCamera(
        -ww/2, ww/2, wh/2, -wh/2, 1, 1000
      ),
      explore: 0,
      exploit: 0,
      param: {
        eps: 1,
        epsDecay: 0.0001,
        lr: 0.1,
        dr: 0.95
      },
      reward: {
        default: -100,
        hit: 200,
        slip: -100
      }
    }
  },
  mounted () {
    const ctx = this

    this.cam.position.z = 1
    this.renderer.setSize(ww, wh)
    this.$el.appendChild(this.renderer.domElement)

    // player 
    let geo = new THREE.PlaneGeometry(0.3*ww, 0.01*wh)
    let mat = new THREE.MeshBasicMaterial({color: 0xff0000})
    let player = new THREE.Mesh(geo, mat)
    player.position.x = 0
    player.position.y = -0.4 * wh
    this.scene.add(player)


    // environment
    const topWall = wh/2
    const leftWall = -ww/2
    const rightWall = ww/2
    const bottomWall = -wh/2

    /* ball stuff */
    /* graphics */
    let ballSize = 10
    let geo1 = new THREE.CircleGeometry(ballSize, 32);
    let mat1 = new THREE.MeshBasicMaterial({color: 0xffffff});
    let ball = new THREE.Mesh(geo1, mat1);
    this.scene.add(ball);

    /* logic */
    let ballSpeed = 12
    let ballDir = null
    const resetBall = function() {
      // eslint-disable-next-line
      const lin = (x, A, B) => (1-x)*A + x*B
      // eslint-disable-next-line
      const rnd = Math.random
      ballDir = new THREE.Vector3(lin(rnd(), -1, 1), lin(rnd(), -1, 1), 0)
      //ballDir = new THREE.Vector3(-1, -1, 0)
      ball.position.x = 0
      ball.position.y = 0
    }
    resetBall()

    const moveBall = function() {
      let {x, y} = ball.position
      let px = player.position.x
      let py = player.position.y
      let pw = geo.parameters.width/2
      let ph = geo.parameters.height/2
      let extraSpeed = 0

      if (x-ballSize <= leftWall) {
        ballDir.reflect(new THREE.Vector3(1, 0, 0))
      }
      if (x+ballSize >= rightWall) {
        ballDir.reflect(new THREE.Vector3(-1, 0, 0))
      }
      if (y+ballSize >= topWall) {
        ballDir.reflect(new THREE.Vector3(0, -1, 0))
      }
      if (y-ballSize <= bottomWall) {
        resetBall()
      }
      // hits player
      if (
        x >= px-pw-ballSize &&
        x <= px+pw+ballSize &&
        y <= py+ph+ballSize &&
        y >= py-ph-ballSize
      ) {
        ballDir.reflect(new THREE.Vector3(0, 1, 0))
        extraSpeed = ballSize*2
      }
      ballDir.normalize()
      ball.translateOnAxis(ballDir, ballSpeed+extraSpeed)
    }

    // add control listeners
    const MS = 10
    let leftSpeed = 0
    let rightSpeed = 0
    document.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "a":
          leftSpeed = -MS
          break
        case "d":
          rightSpeed = MS
          break
        case "w":
          ballSpeed += 1
          break
        case "s":
          ballSpeed -= 1
          break
      }
    })
    document.addEventListener("keyup", ({key}) => {
      switch (key) {
        case "a":
          leftSpeed = 0
          break
        case "d":
          rightSpeed = 0
          break
      }
    })

    // actions
    const MOVE_LEFT = 0
    const MOVE_RIGHT = 1
    const actions = []
    actions[MOVE_LEFT] = function() {
      const marg = 5
      const left = player.position.x - (marg + geo.parameters.width/2)
      player.translateX(left <= -ww/2 ? 0 : -MS)
    }
    actions[MOVE_RIGHT] = function() {
      const marg = 5
      const right = player.position.x + (marg + geo.parameters.width/2)
      player.translateX(right >= ww/2 ? 0 : MS)
    }

    //states
    const ballStatesX = 10
    const ballStatesY = 10
    const playerStates = 10
    const statesToQidx =
      (a, b, c) => ballStatesX*ballStatesY*a + playerStates*b + c

    // Q table
    const Q = []
    const initQ = function() {
      const states = ballStatesX * ballStatesY * playerStates
      for (let i=0; i<states; i++)
        Q[i] = [0, 0]
    }
    initQ()
    //console.table(Q)

    const pixelToState = (px, maxpx, states) => Math.floor(px/(maxpx/states))
    const stateId = (playerPos, ballPosX, ballPosY) => statesToQidx(
      pixelToState(playerPos+ww/2, ww, playerStates),
      pixelToState(ballPosX+ww/2, ww, ballStatesX),
      pixelToState(ballPosY+wh/2, wh, ballStatesY)
    )

    const actionWithHighestQ = (stateId) =>
      (Q[stateId][MOVE_LEFT] > Q[stateId][MOVE_RIGHT]) ?  MOVE_LEFT : MOVE_RIGHT

    const updateQ = function(oldStateId, newStateId, actionId, reward) {
      Q[oldStateId][actionId] += ctx.param.lr * (reward +
        ctx.param.dr*actionWithHighestQ(newStateId) - Q[oldStateId][actionId]
      )
    }

    // eslint-disable-next-line
    const movePlayerByBrain = function() {

      // read state
      const oldStateId = stateId(
        player.position.x,
        ball.position.x,
        ball.position.y
      )

      // chosse action
      let actionId = -1
      if (Math.random() > ctx.param.eps) {
        // exploit = use Q
        actionId = actionWithHighestQ(oldStateId)
        ctx.exploit++
      } else {
        // explore = choose random action
        actionId = Math.floor(10 * Math.random()) % 2
        ctx.explore++ 
      }

      // get reward
      const {x, y, z} = player.position
      const lDist = (new THREE.Vector3(x-MS, y, z)).distanceTo(ball.position)
      const rDist = (new THREE.Vector3(x+MS, y, z)).distanceTo(ball.position)
      let reward = 0
      if (lDist < rDist)
        reward = (actionId === MOVE_LEFT) ? 100 : -100
      else
        reward = (actionId === MOVE_RIGHT) ? 100 : -100

      // take action
      actions[actionId]()

      const newStateId = stateId(
        player.position.x,
        ball.position.x,
        ball.position.y
      )

      updateQ(oldStateId, newStateId, actionId, reward)
      ctx.param.eps = Math.max(0.01, ctx.param.eps-ctx.param.epsDecay)
    }

    // eslint-disable-next-line
    const movePlayerByKeyboard = function() {
      const marg = 5
      const left = player.position.x - (marg + geo.parameters.width/2)
      const right = player.position.x + (marg + geo.parameters.width/2)
      player.translateX(left <= -ww/2 ? 0 : leftSpeed)
      player.translateX(right >= ww/2 ? 0 : rightSpeed)
    }

    // starts animation loop
    let animate = function () {
      requestAnimationFrame(animate)

      moveBall()
      movePlayerByBrain()
      //movePlayerByKeyboard()

      ctx.renderer.render(ctx.scene, ctx.cam)
    }
    animate()
  },
  beforeDestroy () {
    this.renderer.dispose()
  },
  methods: {
  },
  components: {
  }
}
</script>

<style scoped>
.debug {
  position: fixed;
  top: 0;
  left: 0;
  background: whitesmoke;
}
</style>

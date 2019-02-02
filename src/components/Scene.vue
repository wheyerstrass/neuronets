<template>
  <div class="scene">
  </div>
</template>

<script>
import * as THREE from "three"

const ww = window.innerWidth * 0.95
const wh = window.innerHeight * 0.95

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
      debug: { ballX: 0, ballY:0 }
    }
  },
  mounted () {
    const ctx = this

    this.cam.position.z = 1
    this.renderer.setSize(ww, wh)
    this.$el.appendChild(this.renderer.domElement)

    // add geometry
    let geo = new THREE.PlaneGeometry(0.3*ww, 0.05*wh)
    let mat = new THREE.MeshBasicMaterial({color: 0xff0000})
    let plane = new THREE.Mesh(geo, mat)
    plane.position.x = 0
    plane.position.y = -0.4 * wh
    this.scene.add(plane)


    // environment
    const topWall = wh/2
    const leftWall = -ww/2
    const rightWall = ww/2
    const bottomWall = -wh/2
    console.log("TLRB:", topWall, leftWall, rightWall, bottomWall)

    /* ball stuff */
    /* graphics */
    let ballSize = 10
    let geo1 = new THREE.CircleGeometry(ballSize, 32);
    let mat1 = new THREE.MeshBasicMaterial({color: 0xffffff});
    let ball = new THREE.Mesh(geo1, mat1);
    this.scene.add(ball);

    /* logic */
    let ballSpeed = 5
    let ballDir = null
    const resetBall = function() {
      const lin = (x, A, B) => (1-x)*A + x*B
      const rnd = Math.random
      ballDir = new THREE.Vector3(lin(rnd(), -1, 1), lin(rnd(), -1, 1), 0)
      ball.position.x = 0
      ball.position.y = 0
    }
    resetBall()

    const moveBall = function() {
      let {x, y} = ball.position
      let px = plane.position.x
      let py = plane.position.y
      let pw = geo.parameters.width/2
      let ph = geo.parameters.height/2

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
      // hits plane
      if (px-pw < x+ballSize && py+ph > y-ballSize && px+pw > x-ballSize) {
        ballDir.reflect(new THREE.Vector3(0, 1, 0))
      }
      ball.translateOnAxis(ballDir, ballSpeed)
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

    // eslint-disable-next-line
    const movePlaneByBrain = function() {

    }

    const movePlaneByKeyboard = function() {
      const marg = 5
      const left = plane.position.x - (marg + geo.parameters.width/2)
      const right = plane.position.x + (marg + geo.parameters.width/2)
      plane.translateX(left <= -ww/2 ? 0 : leftSpeed)
      plane.translateX(right >= ww/2 ? 0 : rightSpeed)
    }

    // starts animation loop
    let animate = function () {
      requestAnimationFrame(animate)

      movePlaneByKeyboard()
      moveBall()

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
</style>

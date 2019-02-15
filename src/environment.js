import * as THREE from "three"

/* viewport */
const ww = 400
const wh = 600

const scene = new THREE.Scene()

/* setup camera */
const cam = new THREE.OrthographicCamera(
  -ww/2, ww/2, wh/2, -wh/2, 1, 1000
)
cam.position.z = 1

/* setup renderer */
const renderer = new THREE.WebGLRenderer()
renderer.setSize(ww, wh)

/* setup player */
let playerGeo = new THREE.PlaneGeometry(0.3*ww, 0.01*wh)
let playerMat = new THREE.MeshBasicMaterial({color: 0xff0000})
let player = new THREE.Mesh(playerGeo, playerMat)
player.position.x = 0
player.position.y = -0.4 * wh
scene.add(player)

/* build the walls */

/* setup ball */
const ballSize = 10
let ballGeo = new THREE.CircleGeometry(ballSize, 32);
let ballMat = new THREE.MeshBasicMaterial({color: 0xffffff});
let ball = new THREE.Mesh(ballGeo, ballMat);
scene.add(ball);

/* logic */
let ballSpeed = 12
let ballDir = null
const resetBall = function() {
  const lin = (x, A, B) => (1-x)*A + x*B
  const rnd = Math.random
  ballDir = new THREE.Vector3(lin(rnd(), -1, 1), -1, 0)
  ball.position.x = 0
  ball.position.y = 0.75*wh
}
resetBall()


/* actions */
const MS = 10 // Movement Speed
const STAY = 0
const MOVE_LEFT = 1
const MOVE_RIGHT = 2
const actions = []
actions[STAY] = function() {
  // nothing
}
actions[MOVE_LEFT] = function() {
  const marg = 5
  const left = player.position.x - (marg + playerGeo.parameters.width/2)
  player.translateX(left <= -ww/2 ? 0 : -MS)
}
actions[MOVE_RIGHT] = function() {
  const marg = 5
  const right = player.position.x + (marg + playerGeo.parameters.width/2)
  player.translateX(right >= ww/2 ? 0 : MS)
}
const takeAction = function(actionId) {
  actions[actionId]()
}

/* move ball */
const topWall = wh/2
const leftWall = -ww/2
const rightWall = ww/2
const bottomWall = -wh/2

const moveBall = function() {
  let {x, y} = ball.position
  let px = player.position.x
  let py = player.position.y
  let pw = playerGeo.parameters.width/2
  let ph = playerGeo.parameters.height/2
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

/* get reward for chosen action */
const getReward = function(actionId) {
  const {x, y, z} = player.position

  let dist = []
  dist[STAY] = (new THREE.Vector3(x, y, z)).distanceTo(ball.position)
  dist[MOVE_LEFT] = (new THREE.Vector3(x-MS, y, z)).distanceTo(ball.position)
  dist[MOVE_RIGHT] = (new THREE.Vector3(x+MS, y, z)).distanceTo(ball.position)

  /* give 100 reward if chosen action has minimal distance to ball */
  return (dist.indexOf(Math.min(...dist)) === actionId) ?  100 : -100
}

export default {
  actions: {
    Stay: STAY,
    MoveLeft: MOVE_LEFT,
    MoveRight: MOVE_RIGHT,
  },
  getState: function() {
    return {
      ballX: ball.position.x,
      ballY: ball.position.y,
      playerX: player.position.x
    }
  },
  domElement: renderer.domElement,
  simulateStep: function(actionId) {

    moveBall()

    // calc reward of old state
    const reward = getReward(actionId)

    takeAction(actionId)

    /* render new state */
    renderer.render(scene, cam)

    return reward
  }
}

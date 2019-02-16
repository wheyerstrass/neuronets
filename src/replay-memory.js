const memorySize = 100
const replayMem = []

/* store experience */
replayMem.storeExp = function(oldState, actionId, reward, newState) {
  this.push({oldState, actionId, reward, newState})
  if (this.length > memorySize)
    this.shift()
}

replayMem.getRandomSample = function() {
  return this[Math.floor(Math.random() * this.length)]
}

/* retrieve sample experience batch */
replayMem.getRandomSampleBatch = function(size) {
  const batch = []
  for (let i=0; i<size; i++)
    batch[i] = this.getRandomSample()
  return batch
}

export default replayMem

import { useEffect } from 'react'
import { FarmScene } from './components/FarmScene'
import { HUD } from './components/HUD'
import { TouchControls } from './components/TouchControls'
import { useHotkeys } from './game/useKeys'
import { useFarmStore } from './store/farmStore'
import { initMultiplayerFromUrl } from './game/multiplayer'

function Tickers() {
  useEffect(() => {
    initMultiplayerFromUrl()
    const clock = setInterval(() => {
      useFarmStore.getState().tickTime(2)
    }, 1000)
    const water = setInterval(() => {
      useFarmStore.getState().autoIrrigate()
    }, 2000)
    const weather = setInterval(() => {
      useFarmStore.getState().rollWeather()
    }, 100000)
    return () => {
      clearInterval(clock)
      clearInterval(water)
      clearInterval(weather)
    }
  }, [])
  return null
}

function App() {
  useHotkeys()
  return (
    <div className="game-root">
      <Tickers />
      <div className="canvas-wrap">
        <FarmScene />
      </div>
      <HUD />
      <TouchControls />
    </div>
  )
}

export default App

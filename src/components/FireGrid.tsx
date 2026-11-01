import { useEffect, useReducer, useState } from 'react'
import { FireSimulation, FireState, type SimulationSettings } from '../core/FireSimulation'
import type { Vector2 } from '../utils/vector2'

const GRID_SIZE = 50
const STEP_INTERVAL_MS = 150
const WIND_DIRECTIONS = [
  { key: 'N', label: 'North', vector: { x: 0, y: -1 }, position: '1 / 2' },
  { key: 'E', label: 'East', vector: { x: 1, y: 0 }, position: '2 / 3' },
  { key: 'S', label: 'South', vector: { x: 0, y: 1 }, position: '3 / 2' },
  { key: 'W', label: 'West', vector: { x: -1, y: 0 }, position: '2 / 1' },
] as const

type WindDirection = typeof WIND_DIRECTIONS[number]['key']

function getWindDirection(selectedDirections: WindDirection[]): Vector2 {
  const wind = { x: 0, y: 0 }

  for (const direction of WIND_DIRECTIONS) {
    if (!selectedDirections.includes(direction.key)) continue

    wind.x += direction.vector.x
    wind.y += direction.vector.y
  }

  return wind
}

function createSimulation(settings: SimulationSettings): FireSimulation {
  return new FireSimulation(GRID_SIZE, GRID_SIZE, settings)
}

function getCellColor(soil: number, fireState: FireState): string {
  if (fireState === FireState.Burning) return '#ef482f'
  if (fireState === FireState.Burned) return '#15191e'

  const hue = 210 - soil * 160
  return `hsl(${hue}, 80%, 50%)`
}

export default function FireGrid() {
  const [selectedDirections, setSelectedDirections] = useState<WindDirection[]>(['E', 'S'])
  const [windStrength, setWindStrength] = useState(50)
  const [soilDryness, setSoilDryness] = useState(60)
  const settings = {
    windDirection: getWindDirection(selectedDirections),
    windStrength: windStrength / 100,
    soilDryness: soilDryness / 100,
  }
  const [simulation, setSimulation] = useState(() => createSimulation(settings))
  const [isPlaying, setIsPlaying] = useState(false)
  const [, refresh] = useReducer((version: number) => version + 1, 0)

  useEffect(() => {
    if (!isPlaying) return

    const timer = window.setInterval(() => {
      simulation.step()
      refresh()

      if (!simulation.hasActiveFire) setIsPlaying(false)
    }, STEP_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [isPlaying, simulation])

  function handleCellClick(x: number, y: number): void {
    simulation.ignite(x, y)
    refresh()
  }

  function handleStep(): void {
    simulation.step()
    refresh()
  }

  function handleDirectionsChange(directions: WindDirection[]): void {
    simulation.setWindDirection(getWindDirection(directions))
    setSelectedDirections(directions)
  }

  function handleDirectionClick(direction: WindDirection): void {
    const directions = selectedDirections.includes(direction)
      ? selectedDirections.filter((selected) => selected !== direction)
      : [...selectedDirections, direction]

    handleDirectionsChange(directions)
  }

  function handleWindStrengthChange(strength: number): void {
    simulation.setWindStrength(strength / 100)
    setWindStrength(strength)
  }

  function handleSoilDrynessChange(dryness: number): void {
    simulation.setSoilDryness(dryness / 100)
    setSoilDryness(dryness)
  }

  function handleReset(): void {
    setIsPlaying(false)
    setSimulation(createSimulation(settings))
  }

  function renderCells() {
    const cells = []

    for (let y = 0; y < simulation.height; y++) {
      for (let x = 0; x < simulation.width; x++) {
        const fireState = simulation.getFireState(x, y)

        cells.push(
          <button
            className="cell"
            type="button"
            key={`${x}-${y}`}
            aria-label={`Cell ${x + 1}, ${y + 1}: ${FireState[fireState].toLowerCase()}`}
            onClick={() => handleCellClick(x, y)}
            style={{ backgroundColor: getCellColor(simulation.getSoil(x, y), fireState) }}
          />,
        )
      }
    }

    return cells
  }

  const sliders = [
    { id: 'wind-strength', label: 'Wind strength', value: windStrength, onChange: handleWindStrengthChange },
    { id: 'soil-dryness', label: 'Soil dryness', value: soilDryness, onChange: handleSoilDrynessChange },
  ]

  return (
    <section className="simulation" aria-label="Interactive fire simulation">
      <div className="controls">
        <button
          type="button"
          onClick={() => setIsPlaying((playing) => !playing)}
          disabled={!simulation.hasActiveFire}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={handleStep}
          disabled={isPlaying || !simulation.hasActiveFire}
        >
          Next step
        </button>
        <button type="button" className="secondary" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="settings">
        <fieldset className="directions">
          <legend>Wind direction</legend>
          <div className="compass">
            {WIND_DIRECTIONS.map((direction) => (
              <button
                type="button"
                key={direction.key}
                aria-pressed={selectedDirections.includes(direction.key)}
                onClick={() => handleDirectionClick(direction.key)}
                style={{ gridArea: direction.position }}
              >
                {direction.label}
              </button>
            ))}
            <button
              type="button"
              className="no-direction"
              aria-pressed={selectedDirections.length === 0}
              onClick={() => handleDirectionsChange([])}
            >
              None
            </button>
          </div>
        </fieldset>

        <div className="sliders">
          {sliders.map((slider) => (
            <div className="slider-control" key={slider.id}>
              <div className="slider-label">
                <label htmlFor={slider.id}>{slider.label}</label>
                <output htmlFor={slider.id}>{slider.value}%</output>
              </div>
              <input
                id={slider.id}
                type="range"
                min="0"
                max="100"
                step="1"
                value={slider.value}
                aria-valuetext={`${slider.value}%`}
                onChange={(event) => slider.onChange(event.target.valueAsNumber)}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="fire-grid"
        role="group"

        style={{ gridTemplateColumns: `repeat(${simulation.width}, minmax(0, 1fr))` }}
      >
        {renderCells()}
      </div>

    </section>
  )
}

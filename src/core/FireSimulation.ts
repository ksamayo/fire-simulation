import { clamp } from '../utils/math'
import { normalize, type Vector2 } from '../utils/vector2'

export enum FireState {
  Unburned = 0,
  Burning = 1,
  Burned = 2,
}

export type SimulationSettings = {
  windDirection: Vector2
  windStrength: number
  soilDryness: number
}

const BASE_SPREAD_PROBABILITY = 0.3
const NEIGHBOR_DIRECTIONS: Vector2[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
]

export class FireSimulation {
  readonly width: number
  readonly height: number
  private windDirection: Vector2
  private windStrength: number
  private soilDryness: number
  private readonly soilMap: Float32Array
  private readonly fireMap: Uint8Array
  private activeFireIndices: number[] = []

  constructor(width: number, height: number, settings: SimulationSettings) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new RangeError('Grid dimensions must be positive integers.')
    }

    this.width = width
    this.height = height
    this.windDirection = normalize(settings.windDirection)
    this.windStrength = clamp(settings.windStrength, 0, 1)
    this.soilDryness = clamp(settings.soilDryness, 0, 1)
    this.soilMap = new Float32Array(width * height)
    this.fireMap = new Uint8Array(width * height)
    this.generateSoil()
  }

  get hasActiveFire(): boolean {
    return this.activeFireIndices.length > 0
  }

  setWindDirection(direction: Vector2): void {
    this.windDirection = normalize(direction)
  }

  setWindStrength(strength: number): void {
    this.windStrength = clamp(strength, 0, 1)
  }

  setSoilDryness(dryness: number): void {
    this.soilDryness = clamp(dryness, 0, 1)
  }

  getSoil(x: number, y: number): number {
    return this.getSoilAt(this.getIndexOf(x, y))
  }

  getFireState(x: number, y: number): FireState {
    return this.fireMap[this.getIndexOf(x, y)] as FireState
  }

  ignite(x: number, y: number): void {
    if (!this.isInside(x, y) || this.getFireState(x, y) !== FireState.Unburned) return

    const index = this.getIndexOf(x, y)
    this.fireMap[index] = FireState.Burning
    this.activeFireIndices.push(index)
  }

  step(): void {
    const nextActiveFireIndices: number[] = []

    for (const index of this.activeFireIndices) {
      nextActiveFireIndices.push(...this.spreadFrom(index))
      this.fireMap[index] = FireState.Burned
    }

    this.activeFireIndices = nextActiveFireIndices
  }

  private generateSoil(): void {
    for (let index = 0; index < this.soilMap.length; index++) {
      this.soilMap[index] = Math.random()
    }
  }

  private getSoilAt(index: number): number {
    const variation = Math.min(this.soilDryness, 1 - this.soilDryness)
    return this.soilDryness + (this.soilMap[index] * 2 - 1) * variation
  }

  private getIndexOf(x: number, y: number): number {
    return y * this.width + x
  }

  private isInside(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y)
      && x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  private spreadFrom(index: number): number[] {
    const burningX = index % this.width
    const burningY = Math.floor(index / this.width)
    const ignitedIndices: number[] = []

    for (const direction of NEIGHBOR_DIRECTIONS) {
      const neighborX = burningX + direction.x
      const neighborY = burningY + direction.y

      if (!this.isInside(neighborX, neighborY)) continue
      if (this.getFireState(neighborX, neighborY) !== FireState.Unburned) continue

      const neighborIndex = this.getIndexOf(neighborX, neighborY)
      const spreadProbability = this.computeSpreadProbability(neighborIndex, direction)

      if (Math.random() >= spreadProbability) continue

      this.fireMap[neighborIndex] = FireState.Burning
      ignitedIndices.push(neighborIndex)
    }

    return ignitedIndices
  }

  private computeSpreadProbability(targetIndex: number, spreadDirection: Vector2): number {
    const direction = normalize(spreadDirection)
    const windAlignment = direction.x * this.windDirection.x + direction.y * this.windDirection.y
    const windMultiplier = 1 + windAlignment * this.windStrength
    const dryness = this.getSoilAt(targetIndex)

    return clamp(BASE_SPREAD_PROBABILITY * windMultiplier * dryness, 0, 1)
  }
}

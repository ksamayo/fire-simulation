import type { Vector2 } from "../Utils/Vector2";
import { normalize } from "../Utils/Vector2";
import { MathAddon } from "../Utils/MathAddon";

export enum FireState {
    Unburned = 0,
    Burning = 1,
    Burned = 2,
}

const BASE_SPREAD_PROBABILITY = .3;
const BASE_WIND_STRENGTH = .5;
/**
 * Soil Map
 *
 *  We can set soil dryness like :
 *  0 : fully wet
 *  1 : fully dry
 *
 * Fire Map:
 *
 * 0 : Unburned
 * 1 : Burning
 * 2 : Burned
 *
 *
 */
export class FireSimulation {
    private static DIRECTIONS: Vector2[] = [
        {x: 0, y: -1},
        {x: -1, y: 0},
        {x: -1, y: 1},

        {x: -1, y: -1},
        {x: 1, y: -1},

        {x: 0, y: 1},
        {x: 1, y: 0},
        {x: 1, y: 1},
    ]

    private _width: number;
    private _height: number;

    private windDirection: Vector2;

    private soilMap: Float32Array;
    private fireMap: Uint8Array;
    private activeFireIndices: number[];
    private spreadProbability: number;
    private soilDryness: number;


    constructor(
        _width: number,
        _height: number,
        windDirection: Vector2,
    ) {
        this._width = _width;
        this._height = _height;
        this.windDirection = windDirection;

        this.soilDryness = .1
        const cellCount = _width * _height;
        this.soilMap = new Float32Array(cellCount);
        this.generateSoil();
        this.fireMap = new Uint8Array(cellCount);
        this.activeFireIndices = [];
        this.spreadProbability = BASE_SPREAD_PROBABILITY;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    private generateSoil() {
        for(let i = 0; i < this.width*this.height; i++) {
            this.soilMap[i] = (MathAddon.clamp(Math.random() + this.soilDryness, 0, 1));
        }
    }

    public getSoil(x: number, y:number) {
        const index = this.getIndexOf(x,y);

        return this.soilMap[index];
    }

    public getFireState(x: number, y: number) {
        const index = this.getIndexOf(x, y);
        return this.getFireStateAt(index);
    }

    private getIndexOf(x: number, y: number): number {
        return y * this._width + x;
    }

    private getCoordOf(index: number): {x: number, y: number} {
        return {
            x: index % this._width,
            y: Math.floor(index / this._width)
        }
    }

    private isInside(x: number, y: number): boolean {
        return x >= 0 && x < this._width && y >= 0 && y < this._height;
    }

    public ignite(x: number, y: number) {
        const index = this.getIndexOf(x, y);

        if(this.getFireStateAt(index) !== FireState.Unburned) {
            return;
        }

        this.setFireStateAt(index, FireState.Burning);
        this.activeFireIndices.push(index);
    }

    private setFireStateAt(index: number, state: FireState) {
        this.fireMap[index] = state;
    }

    public step() {
        let nextActiveFireIndices: number[] = [];
        for(const index of this.activeFireIndices) {
            this.spreadFrom(index, nextActiveFireIndices);
            this.fireMap[index] = FireState.Burned;
        }
        console.log(nextActiveFireIndices);
        console.log(this.activeFireIndices);
        this.activeFireIndices = nextActiveFireIndices;
    }

    private getFireStateAt(index: number): FireState {
        return this.fireMap[index] as FireState;
    }

    private canIgnite(index: number) {
        const fireState = this.getFireStateAt(index);
        const dryness = this.soilMap[index];

        return fireState == FireState.Unburned && dryness > 0;
    }

    private spreadFrom(index: number, nextActiveFireIndices: number[]): void {
        let burningPosition = this.getCoordOf(index);

        for(const direction of FireSimulation.DIRECTIONS) {
            let n_x = burningPosition.x + direction.x
            let n_y = burningPosition.y + direction.y
            console.log(n_x, n_y)
            if(!this.isInside(n_x, n_y)) {
                console.log("not inside");
                continue;
            }

            const neighborIndex = this.getIndexOf(n_x, n_y);

            if(!this.canIgnite(neighborIndex)) {
                console.log(`can't ignite`)
                continue;
            }

            const spreadProbability = this.computeSpreadProbability(neighborIndex, direction);

            console.log("spread Probability : ", spreadProbability)
            if(Math.random() >= spreadProbability) {
                continue;
            }

            this.fireMap[neighborIndex] = FireState.Burning;
            nextActiveFireIndices.push(neighborIndex);
        }
    }

    private computeSpreadProbability(
        targetIndex: number,
        spreadDirection: Vector2,
    ): number {
        const dryness = this.soilMap[targetIndex];

        spreadDirection = normalize(spreadDirection);
        const windAlignment = spreadDirection.x * this.windDirection.x + spreadDirection.y * this.windDirection.y;
          console.log("wind Alignment : ", windAlignment);
        const windStrength = BASE_WIND_STRENGTH;
        const windMultiplier = 1 + windAlignment + windStrength;

        console.log("Spread Probability before clamping : ", this.spreadProbability * windMultiplier * dryness);
        return MathAddon.clamp(this.spreadProbability * windMultiplier * dryness, 0, 1);
    }

}

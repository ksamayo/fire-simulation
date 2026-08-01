import { useRef, useState} from "react";
import { FireSimulation, FireState } from "../core/FireSimulation";

const CELL_SIZE = 20

export default function FireGrid() {
    const simulation = useRef( new FireSimulation(50, 50, {x: 1, y: 1}) ).current;
    const [_, forceRender]= useState(0);

    function refresh(): void {
        forceRender((value) => value+1);
    }
    function renderCells() {
        let cells = [];

        for(let y = 0; y < simulation.width; y++) {
            for(let x = 0; x < simulation.height; x++) {
                cells.push(
                    createCell(x, y)
                );
            }
        }

        return cells
    }

    function handleCellClick(x: number, y: number) {
        simulation.ignite(x, y);
        refresh();
    }

    function handleStep() {
        simulation.step();
        refresh();
    }

    function createCell(x: number, y: number) {
        return <button
            type="button"
            key={`${x}-${y}`}
            onClick = {() => handleCellClick(x, y)}

            style = {{
                backgroundColor: getCellColor(simulation.getSoil(x, y), simulation.getFireState(x, y)),
                width: CELL_SIZE,
                height: CELL_SIZE,
                cursor: "pointer"
            }}
        >
        </button>
    }

    function getCellColor(soil: number, fireState : FireState): string {
        if(fireState == FireState.Burning) {
            return "red";
        }

        if(fireState == FireState.Burned) {
            return "black";
        }
        const hue = 210 - soil* 160;

        return `hsl(${hue}, 80%, 50%)`;
    }


    return (
        <div

            style={{
                display: "grid",
                gridTemplateColumns: `repeat(
                    ${simulation.width},
                    ${CELL_SIZE}px
                )`,
                width: ""
            }}
        >
            <button
                onClick={() => handleStep()}
            >
                kjhasdf
            </button>
            {renderCells()}
        </div>
    )
}

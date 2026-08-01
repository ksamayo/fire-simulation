

export type Vector2 = {
    x: number,
    y: number
}

export function normalize(vec: Vector2): Vector2 {
    const length = Math.sqrt(Math.pow(vec.x, 2)+ Math.pow(vec.y, 2));

    return {x: vec.x/length, y: vec.y/length}
}

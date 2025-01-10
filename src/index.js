import { state } from "./state.js"
import { guiButtons, fpsController, spsController } from "./controls.js"


const mouseButtonsDown = { 0: false, 1: false, 2: false }

export let canvas, glsl, cells
let targetMass

let frameCount = 0
let stepCount = 0
let lastCountsUpdate = 0
let stepTimer = 0

async function load_file(shaderPath) {
    const res = await fetch(shaderPath)
    return await res.text()
}

const shaders = {}
async function load_shaders() {
    const target_mass = await load_file("src/shaders/target_mass.glsl")
    shaders.target_mass = function(p_size) {
        return target_mass.replace("${p_size}", p_size)
    }

    shaders.mass_transfer = await load_file("src/shaders/mass_transfer.glsl")
    shaders.interact = await load_file("src/shaders/interact.glsl")
    shaders.draw_postprocessed = await load_file("src/shaders/draw_postprocessed.glsl")
    shaders.loaded = true
}
load_shaders()

export const cellsTargetParams = {
    scale: 1 / state.guiParams["pixels per cell"] / window.devicePixelRatio,
    format: "rgba32f",
    story: 2,
    tag: "cells",
}

window.setup = function() {
    canvas = createCanvas(windowWidth, windowHeight, WEBGL)
    glsl = SwissGL(canvas.elt)
    cells = glsl({
        seed: Math.random() * 12417,
        FP: "hash(ivec3(I, seed)), 1"
    }, { ...cellsTargetParams })

    if (!state.paramsHistory.length) {
        state.paramsHistory.push(newParams())
    }
    frameRate(60)

    addEventListener("contextmenu", e => {
        e.preventDefault()
    })

    setTimeout(() => {
        windowResized()
    }, 100)
}

export function newParams() {
    const paramSets = {
        objects: [],
        encoded: [],
    }
    for (let k = 0; k < state.guiParams.tile**2; k++) {
        const perceptDists = [], perceptSharp = []
        const w1 = [], bias1 = [], w2 = [], bias2 = []

        for (let i = 0; i < 3 * 3; i++) {
            perceptDists.push(random())
        }
        for (let i = 0; i < 3 * 3; i++) {
            perceptSharp.push(random(4, 16))
        }
        for (let i = 0; i < 9 * 6; i++) {
            w1.push(random(-1, 1) * 10)
        }
        for (let i = 0; i < 6; i++) {
            bias1.push(random())
        }
        for (let i = 0; i < 6 * 3; i++) {
            w2.push(random(-1, 1) * 10)
        }
        for (let i = 0; i < 3; i++) {
            bias2.push(random())
        }

        paramSets.objects.push({
            perceptDists, perceptSharp,
            w1, bias1,
            w2, bias2,
        })
    }

    for (const params of paramSets.objects) {
        for (const name of [
            "perceptDists", "perceptSharp", "w1", "bias1", "w2", "bias2"
        ]) {
            paramSets.encoded = paramSets.encoded.concat(params[name])
        }
    }

    return paramSets
}

function mutateParams(selectedParams) {
    const paramSets = {
        objects: [],
        encoded: [],
    }
    const sp = selectedParams
    const amt = state.guiParams["mutation strength"]
    for (let k = 0; k < state.guiParams.tile**2; k++) {
        const perceptDists = [], perceptSharp = []
        const w1 = [], bias1 = [], w2 = [], bias2 = []

        for (let i = 0; i < 3 * 3; i++) {
            perceptDists.push(
                min(max(
                    sp.perceptDists[i] + random(-0.5, 0.5) * amt,
                0), 1)
            )
        }
        for (let i = 0; i < 3 * 3; i++) {
            perceptSharp.push(
                min(max(
                    sp.perceptSharp[i] + random(-6, 6) * amt,
                4), 16)
            )
        }
        for (let i = 0; i < 9 * 6; i++) {
            w1.push(
                min(max(
                    sp.w1[i] + random(-10, 10) * amt,
                -10), 10)
            )
        }
        for (let i = 0; i < 6; i++) {
            bias1.push(
                min(max(
                    sp.bias1[i] + random(-0.5, 0.5) * amt,
                0), 1)
            )
        }
        for (let i = 0; i < 6 * 3; i++) {
            w2.push(
                min(max(
                    sp.w2[i] + random(-10, 10) * amt,
                -10), 10)
            )
        }
        for (let i = 0; i < 3; i++) {
            bias2.push(
                min(max(
                    sp.bias2[i] + random(-0.5, 0.5) * amt,
                0), 1)
            )
        }

        paramSets.objects.push({
            perceptDists, perceptSharp,
            w1, bias1,
            w2, bias2,
        })
    }

    for (const params of paramSets.objects) {
        for (const name of [
            "perceptDists", "perceptSharp", "w1", "bias1", "w2", "bias2"
        ]) {
            paramSets.encoded = paramSets.encoded.concat(params[name])
        }
    }

    return paramSets
}

window.mousePressed = function(e) {
    if (e.target !== canvas.elt) { return }
    if (e.detail > 1) {
        e.preventDefault()
    }
    if (e.button in mouseButtonsDown) {
        mouseButtonsDown[e.button] = true
    }

    if (e.button === 2) {
        const tile = state.guiParams.tile
        const tileX = min(max(int(mouseX / windowWidth * tile), 0), tile - 1)
        const tileY = min(max(int(mouseY / windowHeight * tile), 0), tile - 1)
        const tileIdx = tileY * tile + tileX
        const selectedParams = (
            state.paramsHistory[state.historyIdx].objects[tileIdx]
        )
        state.paramsHistory.push(mutateParams(selectedParams))
        state.historyIdx = state.paramsHistory.length - 1
        guiButtons.reseed()
    }
}

window.mouseReleased = function(e) {
    if (e.button in mouseButtonsDown) {
        mouseButtonsDown[e.button] = false
    }
}

// better version of mouseIsPressed
function mouseIsDown(button) {
    if (button === undefined) {
        for (const b in mouseButtonsDown) {
            if (mouseButtonsDown[b]) {
                return true
            }
        }
        return false
    }
    return button in mouseButtonsDown && mouseButtonsDown[button]
}

window.keyPressed = function(e) {
    if (key === "f") {
        guiButtons["new params"]()
    } else if (key === "ArrowLeft") {
        guiButtons["last params"]()
    } else if (key === "ArrowRight") {
        guiButtons["next params"]()
    } else if (key === "r") {
        guiButtons.reseed()
    } else if (key === " ") {
        guiButtons.pause()
    } else if (key === "s") {
        guiButtons.step()
    } else if (key === "Backspace") {
        e.preventDefault()
    }
}

export function step() {
    const p_size = 33 * state.guiParams.tile**2
    targetMass = glsl({
        cells: cells[0],
        p: state.paramsHistory[state.historyIdx].encoded,
        tile: state.guiParams.tile,
        FP: shaders.target_mass(p_size),
    }, {
        size: cells[0].size,
        format: "rgba32f",
        tag: "targetMass",
    })

    cells = glsl({
        targetMass,
        seed: Math.random() * 12417,
        gravity: state.guiParams.gravity,
        solidVerticalBorders: state.guiParams["solid vertical borders"],
        tile: state.guiParams.tile,
        FP: shaders.mass_transfer,
    }, { ...cellsTargetParams })
}

function interact() {
    if (mouseIsDown(0)) {
        const aspect = windowWidth / windowHeight
        const ww = windowWidth, wh = windowHeight
        let mxSquare, mySquare
        if (aspect > 1) {
            mxSquare = (ww / 2 + (mouseX - ww / 2) * aspect) / ww
            mySquare = 1 - mouseY / wh
        } else {
            mxSquare = mouseX / ww
            mySquare = 1 - (wh / 2 + (mouseY - wh / 2) / aspect) / wh
        }
        glsl({
            seed: Math.random() * 12417,
            mouseSquare: [mxSquare, mySquare],
            brushSize: state.guiParams["brush size"],
            cells: cells[1],
            FP: shaders.interact,
        }, cells[0])
    }
}

window.draw = function() {
    if (!shaders.loaded) return

    stepTimer = max(stepTimer - deltaTime, -1000 / 30)
    const startMillis = millis()
    while (
        !state.pause
        && stepTimer < 0
        && millis() - startMillis < 1000 / 30
    ) {
        step()
        stepCount++
        stepTimer += 1000 / state.guiParams["target steps/sec"]
    }
    interact()

    if (state.guiParams["postprocess colors"]) {
        glsl({
            cells: cells[0],
            FP: shaders.draw_postprocessed,
        })
    } else {
        glsl({
            cells: cells[0],
            FP: "cells(UV)",
        })
    }

    frameCount++
    if (millis() - lastCountsUpdate >= 1000) {
        lastCountsUpdate = millis()
        fpsController.setValue(frameCount)
        spsController.setValue(stepCount)
        frameCount = 0
        stepCount = 0
    }
}

window.windowResized = function() {
    resizeCanvas(window.innerWidth, window.innerHeight)
}

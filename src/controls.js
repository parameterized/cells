import { glsl, cells, newParams, cellsTargetParams, step } from "./index.js"
import { state } from "./state.js"


const sauce = document.documentElement.innerHTML

export const guiButtons = {
    "new params": () => {
        state.paramsHistory.push(newParams())
        state.historyIdx = state.paramsHistory.length - 1
        guiButtons.reseed()
    },
    "last params": () => {
        if (state.historyIdx === 0) { return }
        state.historyIdx = max(state.historyIdx - 1, 0)
        if (state.guiParams["reseed on next/last params"]) {
            guiButtons.reseed()
        }
    },
    "next params": () => {
        if (state.historyIdx === state.paramsHistory.length - 1) { return }
        state.historyIdx = min(
            state.historyIdx + 1,
            state.paramsHistory.length - 1
        )
        if (state.guiParams["reseed on next/last params"]) {
            guiButtons.reseed()
        }
    },
    reseed: () => {
        glsl({ FP: "0" }, cells)
        step()
    },
    pause: () => {
        state.pause = !state.pause
    },
    step,
    "save as html": () => {
        const sauceWithState = sauce.replace(
            /(?<=const state = ).*/,
            `JSON.parse('${JSON.stringify(state)}')`
        )
        const a = document.createElement("a")
        const bob = new Blob([sauceWithState], {type: "text/plain"})
        a.setAttribute("href", URL.createObjectURL(bob))
        a.setAttribute("download", `${state.guiParams.filename}.html`)
        a.click()
    },
    "save as png": () => {
        const screenshotData = canvas.elt.toDataURL("image/png").replace(
            "image/png",
            "image/octet-stream"
        )
        const a = document.createElement("a")
        a.setAttribute("href", screenshotData)
        a.setAttribute("download", `${state.guiParams.filename}.png`)
        a.click()
    }
}

const gui = new lil.GUI()
gui.domElement.classList.add("force-touch-styles")
gui.domElement.onclick = e => {
    if (e.target.tagName === "DIV") {
        e.target.blur()
    }
}
gui.close()

for (const name in guiButtons) {
    gui.add(guiButtons, name)
}

state.guiParams = state.guiParams || {
    filename: `cells_${Math.random().toFixed(5).substr(2)}`,
    "reseed on next/last params": true,
    "mutation strength": 0.05,
    "pixels per cell": 6,
    gravity: 0,
    "solid vertical borders": false,
    "postprocess colors": false,
    tile: 2,
    "target steps/sec": 60,
    "brush size": 0.1,
}
gui.add(state.guiParams, "filename")
gui.add(state.guiParams, "reseed on next/last params")
gui.add(state.guiParams, "mutation strength", 0, 1, 0.001)
gui.add(state.guiParams, "pixels per cell", 1, 12, 0.1).onChange( value => {
    cellsTargetParams.scale = (
        1 / state.guiParams["pixels per cell"] / window.devicePixelRatio
    )
})
gui.add(state.guiParams, "gravity", -1, 1, 0.05)
gui.add(state.guiParams, "solid vertical borders")
gui.add(state.guiParams, "postprocess colors")
gui.add(state.guiParams, "tile", 1, 4, 1)
gui.add(state.guiParams, "target steps/sec", 30, 2000, 1)
export const fpsController = gui.add({ "frames/sec": 0 }, "frames/sec").disable()
export const spsController = gui.add({ "steps/sec": 0 }, "steps/sec").disable()
gui.add(state.guiParams, "brush size", 0.01, 0.5, 0.01)

gui.add({ "sorce": () => {
    const a = document.createElement("a")
    a.setAttribute("href", "https://github.com/parameterized/cells/blob/main/index.html")
    a.setAttribute("target", "_blank")
    a.click()
}}, "sorce")


gui.onChange(e => {
    for (const elt of [
        ...document.getElementsByTagName("button"),
        ...document.getElementsByTagName("input"),
    ]) {
        if (elt.type !== "text") {
            elt.blur()
        }
    }
})

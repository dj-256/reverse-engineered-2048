class KeyboardInputManager {
    constructor() {
        this.events = {}
        if (window.navigator.msPointerEnabled) {
            this.eventTouchstart = "MSPointerDown"
            this.eventTouchmove = "MSPointerMove"
            this.eventTouchend = "MSPointerUp"
        } else {
            this.eventTouchstart = "touchstart"
            this.eventTouchmove = "touchmove"
            this.eventTouchend = "touchend"
        }
        this.listen()
    }

    /**
     * Binds an event to a callback function
     * @param eventName {String} Name of the event to bind
     * @param callback {Function} The callback to be fired on the event
     */
    on = (eventName, callback) => {
        this.events[eventName] || (this.events[eventName] = [])
        this.events[eventName].push(callback)
    }

    /**
     * Fires an event
     * @param eventName {String} Name of the event to fire
     * @param value {Object} The value to pass to the event listeners
     */
    emit = (eventName, value=null) => {
        const callbacks = this.events[eventName]
        if (callbacks) {
            callbacks.forEach(callback => callback(value))
        }
    }

    /**
     * Listen for touch events
     */
    listen = () => {
        let eventStartX, eventStartY
        const keyMapping = { 38: 0, 39: 1, 40: 2, 37: 3, 75: 0, 76: 1, 74: 2, 72: 3, 87: 0, 68: 1, 83: 2, 65: 3 }
        document.addEventListener("keydown", event => {
            const isSpecialKey = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
            let direction = keyMapping[event.which]
            if (this.targetIsInput(event) || isSpecialKey) {
                return
            }
            if (direction !== undefined) {
                event.preventDefault()
                this.emit("move", direction)
            }
            if (82 === event.which) {
                this.restart.call(event)
            }
        })
        this.bindButtonPress(".retry-button", this.restart)
        this.bindButtonPress(".restart-button", this.restart)
        this.bindButtonPress(".keep-playing-button", this.keepPlaying)

        const gameContainer = document.getElementsByClassName("game-container")[0]
        gameContainer.addEventListener(this.eventTouchstart,
            event => {
                if (!window.navigator.msPointerEnabled) {
                    if (event.touches.length > 1) {
                        return true
                    }
                    if (event.targetTouches.length > 1) {
                        return true
                    }
                    if (!this.targetIsInput(event)) {
                        if (window.navigator.msPointerEnabled) {
                            eventStartX = event.pageX
                            eventStartY = event.pageY
                            event.preventDefault()
                        } else {
                            eventStartX = event.touches[0].clientX
                            eventStartY = event.touches[0].clientY
                            event.preventDefault()
                        }
                    }
                }
            },
            { passive: true }
        )

        gameContainer.addEventListener(this.eventTouchmove, event => {
                event.preventDefault()
            }, { passive: true }
        )

        gameContainer.addEventListener(this.eventTouchend, event => {
            if (!(!window.navigator.msPointerEnabled && event.touches.length > 0 || event.targetTouches.length > 0 || i.targetIsInput(event))) {
                let eventEndX, eventEndY
                if (window.navigator.msPointerEnabled) {
                    eventEndX = event.pageX
                    eventEndY = event.pageY
                } else {
                    eventEndX = event.changedTouches[0].clientX
                    eventEndY = event.changedTouches[0].clientY
                }
                let deltaX = eventEndX - eventStartX
                let absDeltaX = Math.abs(deltaX)
                let deltaY = eventEndY - eventStartY
                let absDeltaY = Math.abs(deltaY)
                Math.max(absDeltaX, absDeltaY) > 10 && this.emit("move", absDeltaX > absDeltaY ? deltaX > 0 ? 1 : 3 : deltaY > 0 ? 2 : 0)
            }
        })
    }

    /**
     * Handles the restart event
     * @param event {Event} The event to handle
     */
    restart = (event) => {
        event.preventDefault()
        this.emit("restart")
    }

    /**
     * Handles the keep playing event
     * @param event {Event} The event to handle
     */
    keepPlaying = (event) => {
        event.preventDefault()
        this.emit("keepPlaying")
    }

    /**
     * Binds a button press to an event
     * @param buttonSelector {String} The selector for the button
     * @param callback {Function} The callback to fire on the event
     */
    bindButtonPress = (buttonSelector, callback) => {
        const button = document.querySelector(buttonSelector)
        button.addEventListener("click", callback)
        button.addEventListener(this.eventTouchend, callback)
    }

    /**
     * Checks if the target of an event is an input
     * @param event {Event} The event to check
     * @returns {boolean} True if the target is an input, false otherwise
     */
    targetIsInput = (event) => "input" === event.target.tagName.toLowerCase()
}

class HTMLActuator {
    constructor() {
        this.tileContainer = document.querySelector(".tile-container")
        this.scoreContainer = document.querySelector(".score-container")
        this.bestContainer = document.querySelector(".best-container")
        this.messageContainer = document.querySelector(".game-message")
        this.score = 0
    }

    /**
     * Updates the cells and the state of the game
     * @param grid {Grid} The grid to update
     * @param gameState {{score: (number|*), over: boolean, won: boolean, bestScore: number, terminated: boolean}} The state of the game
     */
    actuate = (grid, gameState) => {
        window.requestAnimationFrame(() => {
            this.clearContainer(this.tileContainer)
            grid.cells.forEach(line => {
                line.forEach(cell => cell && this.addTile(cell))
            })
            this.updateScore(gameState.score)
            this.updateBestScore(gameState.bestScore)
            if (gameState.terminated) {
                if (gameState.over) {
                    this.message(!1)
                } else {
                    gameState.won && this.message(!0)
                }
            }
        })
    }

    /**
     * Clears the message container so that the player can
     * keep playing
     */
    continueGame = () => {
        // if ("undefined" != typeof gtag) {
        //     gtag("event", "restart", { event_category: "game" })
        // }
        this.clearMessage()
    }

    /**
     * Clears an element of all its children
     * @param container {HTMLElement} The element to clear
     */
    clearContainer = (container) => {
        for (; container.firstChild;) container.removeChild(container.firstChild)
    }

    /**
     * Adds a tile to the container.
     * @param tile {Tile} The tile to add.
     */
    addTile = tile => {
        const tileElement = document.createElement("div")
        const tileInner = document.createElement("div")
        const previousPosition = tile.previousPosition || { x: tile.x, y: tile.y }
        const previousPositionClass = this.positionClass(previousPosition)
        const classes = ["tile", "tile-" + tile.value, previousPositionClass]

        tile.value > 2048 && classes.push("tile-super")
        this.applyClasses(tileElement, classes)
        tileInner.classList.add("tile-inner")
        tileInner.textContent = tile.value
        if (tile.previousPosition) {
            window.requestAnimationFrame(() => {
                classes[2] = this.positionClass({ x: tile.x, y: tile.y })
                this.applyClasses(tileElement, classes)
            })
            tileElement.appendChild(tileInner)
            this.tileContainer.appendChild(tileElement)
        } else {
            if (tile.mergedFrom) {
                classes.push("tile-merged")
                this.applyClasses(tileElement, classes)
                tile.mergedFrom.forEach(tile => this.addTile(tile))
                tileElement.appendChild(tileInner)
                this.tileContainer.appendChild(tileElement)
            } else {
                classes.push("tile-new")
                this.applyClasses(tileElement, classes)
                tileElement.appendChild(tileInner)
                this.tileContainer.appendChild(tileElement)
            }
        }
    }

    /**
     * Apply CSS classes to an element.
     * @param element {HTMLElement} The element to which the classes will be applied.
     * @param classes {String[]} An array of class names.
     */
    applyClasses = (element, classes) =>
        element.setAttribute("class", classes.join(" "))

    /**
     * Normalizes the position of a tile
     * @param position {{x: *, y: *}} x and y coordinates
     * @returns {{x: *, y: *}} normalized position
     */
    normalizePosition = position => ({ x: position.x + 1, y: position.y + 1 })

    /**
     * Returns the class for a tile based on its position
     * @param position {{x: *, y: *}} the position of the tile
     * @returns {string} the HTML class for the tile
     */
    positionClass = position => {
        let normalized = this.normalizePosition(position)
        return "tile-position-" + normalized.x + "-" + normalized.y
    }

    /**
     * Updates the score
     * @param score {number} the new score
     */
    updateScore = score => {
        this.clearContainer(this.scoreContainer)
        const diff = score - this.score
        this.score = score
        this.scoreContainer.textContent = this.score
        if (diff > 0) {
            const scoreIncreaseElement = document.createElement("div")
            scoreIncreaseElement.classList.add("score-addition")
            scoreIncreaseElement.textContent = "+" + diff
            this.scoreContainer.appendChild(scoreIncreaseElement)
        }
    }

    /**
     * Updates the best score
     * @param bestScore {number} the new best score
     */
    updateBestScore = bestScore => this.bestContainer.textContent = bestScore

    /**
     * Displays a message when the game is over or won
     * @param isWin {boolean} whether the game is won or lost
     */
    message = isWin => {
        const messageClass = isWin ? "game-won" : "game-over"
        const messageContent = isWin ? "You win!" : "Game over!"
        // "undefined" != typeof gtag && gtag("event", "end", {
        //     event_category: "game",
        //     event_label: messageClass,
        //     value: this.score
        // })
        this.messageContainer.classList.add(messageClass)
        this.messageContainer.getElementsByTagName("p")[0].textContent = messageContent
    }

    /**
     * Clears the game message element classes
     */
    clearMessage = () => {
        this.messageContainer.classList.remove("game-won")
        this.messageContainer.classList.remove("game-over")
    }
}

class Grid {
    constructor(size, state) {
        this.size = size
        this.cells = state ? this.fromState(state) : this.empty()
    }

    /**
     * Build a grid of the specified size
     * @returns {*[]} a size x size matrix containing nulls
     */
    empty = () => {
        const lines = []
        for (let i = 0; i < this.size; i ++) {
            lines[i] = []
            for (let j = 0; j < this.size; j ++) {
                lines[i].push(null)
            }
        }
        return lines
    }

    /**
     * Build a grid of the specified size from a state
     * @param state {*[]} the state to build the grid from
     * @returns {*[]} a size x size matrix containing the tiles
     */
    fromState = state => {
        const lines = []
        for (let i = 0; i < this.size; i ++) {
            lines[i] = []
            for (let n = 0; n < this.size; n ++) {
                const stateValue = state[i][n]
                lines[i].push(stateValue ? new Tile(stateValue.position, stateValue.value) : null)
            }
        }
        return lines
    }

    /**
     * Returns a random available position
     * @returns {*} a random position
     */
    randomAvailableCell = () => {
        const cells = this.availableCells()
        if (cells.length) return cells[Math.floor(Math.random() * cells.length)]
    }

    /**
     * Returns all available cells
     * @returns {*[]} an array of available cells
     */
    availableCells = () => {
        const res = []
        this.eachCell((i, j, cell) => cell || res.push({ x: i, y: j }))
        return res
    }

    /**
     * Calls callback for every cell
     * @param callback {Function} the callback to call for each cell
     */
    eachCell = callback => {
        for (let i = 0; i < this.size; i ++) {
            for (let j = 0; j < this.size; j ++) {
                callback(i, j, this.cells[i][j])
            }
        }
    }

    /**
     * Checks if there are any cells available
     * @returns {boolean} true if there are cells available, false otherwise
     */
    cellsAvailable = () => !!this.availableCells().length

    /**
     * Checks if the specified cell is available
     * @param cell {{x: *, y: *}} the cell to check
     * @returns {boolean} true if the cell is available, false otherwise
     */
    cellAvailable = cell => !this.cellOccupied(cell)

    /**
     * Checks if the specified cell is occupied
     * @param cell {{x: *, y: *}} the cell to check
     * @returns {boolean} true if the cell is occupied, false otherwise
     */
    cellOccupied = cell => !!this.cellContent(cell)

    /**
     * Returns the content of a cell
     * @param cell {{x: *, y: *}} the cell to get the content of
     * @returns {*|null} the content of the cell
     */
    cellContent = cell => this.withinBounds(cell) ? this.cells[cell.x][cell.y] : null

    /**
     * Inserts a tile at its position
     * @param cell {{x: *, y: *}} the position of the tile
     */
    insertTile = cell => this.cells[cell.x][cell.y] = cell

    /**
     * Removes a tile from its position
     * @param cell {{x: *, y: *}} the position of the tile
     */
    removeTile = cell => this.cells[cell.x][cell.y] = null

    /**
     * Checks if a position is within the grid bounds
     * @param cell {{x: *, y: *}} the position to check
     * @returns {boolean} true if the position is within the grid bounds, false otherwise
     */
    withinBounds = cell =>
        cell.x >= 0 && cell.x < this.size && cell.y >= 0 && cell.y < this.size

    /**
     * Serializes the grid
     * @returns {{cells: *[], size}} the serialized grid
     */
    serialize = () => {
        const cells = []
        for (let i = 0; i < this.size; i ++) {
            cells[i] = []
            for (let j = 0; j < this.size; j ++) {
                cells[i].push(this.cells[i][j] ? this.cells[i][j].serialize() : null)
            }
        }
        return { size: this.size, cells: cells }
    }
}

class Tile {
    constructor(position, value) {
        this.x = position.x
        this.y = position.y
        this.value = value || 2
        this.previousPosition = null
        this.mergedFrom = null
    }

    /**
     * Saves the previous position of the tile
     */
    savePosition = () => {
        this.previousPosition = { x: this.x, y: this.y }
    }

    /**
     * Updates the tile position
     * @param newPosition {{x: *, y: *}} the new position
     */
    updatePosition = newPosition => {
        this.x = newPosition.x
        this.y = newPosition.y
    }

    /**
     * Serializes the tile
     * @returns {{position: {x, y}, value: (*|number)}} the serialized tile
     */
    serialize = () => ({ position: { x: this.x, y: this.y }, value: this.value })
}

class LocalStorageManager {
    constructor() {
        this.bestScoreKey = "bestScore"
        this.gameStateKey = "gameState"
        this.noticeClosedKey = "noticeClosed"
        this.cookieNoticeClosedKey = "cookieNoticeClosed"
        const e = this.localStorageSupported()
        this.storage = e ? window.localStorage : window.fakeStorage
    }

    /**
     * Checks if local storage is supported
     * @returns {boolean} true if local storage is supported, false otherwise
     */
    localStorageSupported = () => {
        const testValue = "test"
        const localStorage = window.localStorage
        try {
            localStorage.setItem(testValue, "1")
            localStorage.removeItem(testValue)
            return true
        } catch (e) {
            return false
        }
    }

    /**
     * Returns the best score
     * @returns {string|number} the best score
     */
    getBestScore = () => this.storage.getItem(this.bestScoreKey) || 0

    /**
     * Sets the best score
     * @param newBestScore {string|number} the new best score
     */
    setBestScore = newBestScore => this.storage.setItem(this.bestScoreKey, newBestScore)

    /**
     * Returns the game state
     * @returns {any|null} the game state
     */
    getGameState = () => {
        const gameState = this.storage.getItem(this.gameStateKey)
        return gameState ? JSON.parse(gameState) : null
    }

    /**
     * Sets the game state
     * @param newGameState {Object} the new game state
     */
    setGameState = newGameState => {
        this.storage.setItem(this.gameStateKey, JSON.stringify(newGameState))
    }

    /**
     * Clears the game state
     */
    clearGameState = () => {
        this.storage.removeItem(this.gameStateKey)
    }

    setNoticeClosed = e => {
        this.storage.setItem(this.noticeClosedKey, JSON.stringify(e))
    }

    getNoticeClosed = () => JSON.parse(this.storage.getItem(this.noticeClosedKey) || "false")

    setCookieNoticeClosed = isClosed => {
        this.storage.setItem(this.cookieNoticeClosedKey, JSON.stringify(isClosed))
    }

    getCookieNoticeClosed = () =>
        JSON.parse(this.storage.getItem(this.cookieNoticeClosedKey) || "false")
}

class GameManager {
    constructor(size, inputManager, actuator, storageManager) {
        this.size = size
        this.inputManager = inputManager
        this.storageManager = storageManager
        this.actuator = actuator
        this.startTiles = 2
        this.inputManager.on("move", this.move.bind(this))
        this.inputManager.on("restart", this.restart.bind(this))
        this.inputManager.on("keepPlaying", this.keepPlaying.bind(this))
        this.over = false
        this.won = false
        this.setup()
    }

    /**
     * Clears the state of the game and restarts it
     */
    restart = () => {
        this.storageManager.clearGameState()
        this.actuator.continueGame()
        this.setup()
    }

    /**
     * Keeps playing after winning (allows going over 2048)
     */
    keepPlaying = () => {
        this.keepPlaying = true
        this.actuator.continueGame()
    }

    /**
     * Checks if the game is over
     * @returns {boolean} true if the game is over, false otherwise
     */
    isGameTerminated = () => this.over || this.won && !this.keepPlaying

    /**
     * Sets up the game
     */
    setup = () => {
        const gameState = this.storageManager.getGameState()
        if (gameState) {
            this.grid = new Grid(gameState.grid.size, gameState.grid.cells)
            this.score = gameState.score
            this.over = gameState.over
            this.won = gameState.won
            this.keepPlaying = gameState.keepPlaying
            this.actuate()
        } else {
            this.grid = new Grid(this.size)
            this.score = 0
            this.over = false
            this.won = false
            this.keepPlaying = false
            this.addStartTiles()
            this.actuate()
        }
    }

    /**
     * Adds the initial tiles to the grid
     */
    addStartTiles = () => {
        for (let i = 0; i < this.startTiles; i ++)
            this.addRandomTile()
    }

    /**
     * Adds a tile in a random position
     */
    addRandomTile = () => {
        if (this.grid.cellsAvailable()) {
            const tileValue = Math.random() < .9 ? 2 : 4
            const tile = new Tile(this.grid.randomAvailableCell(), tileValue)
            this.grid.insertTile(tile)
        }
    }

    /**
     * Sends the updated grid and game state to the actuator
     */
    actuate = () => {
        if (this.storageManager.getBestScore() < this.score) {
            this.storageManager.setBestScore(this.score)
        }
        this.over ? this.storageManager.clearGameState() : this.storageManager.setGameState(this.serialize())
        this.actuator.actuate(this.grid, {
            score: this.score,
            over: this.over,
            won: this.won,
            bestScore: this.storageManager.getBestScore(),
            terminated: this.isGameTerminated()
        })

    }

    /**
     * Serializes the game
     * @returns {{over: boolean, score: (number|*), grid: {cells: *[], size}, won: boolean, keepPlaying: GameManager.keepPlaying}} the serialized game
     */
    serialize = () => ({
        grid: this.grid.serialize(),
        score: this.score,
        over: this.over,
        won: this.won,
        keepPlaying: this.keepPlaying
    })

    /**
     * Prepares the game to be serialized
     */
    prepareTiles = () => {
        this.grid.eachCell((i, j, cell) => {
            if (cell) {
                cell.mergedFrom = null
                cell.savePosition()
            }
        })
    }

    /**
     * Moves a tile and its representation
     * @param initialPosition {{x: *, y: *}} the initial position
     * @param newPosition {{x: *, y: *}} the new position
     */
    moveTile = (initialPosition, newPosition) => {
        this.grid.cells[initialPosition.x][initialPosition.y] = null
        this.grid.cells[newPosition.x][newPosition.y] = initialPosition
        initialPosition.updatePosition(newPosition)
    }

    /**
     * Performs a move for the given direction
     * @param key {0|1|2|3} the direction
     */
    move = key => {
        if (!this.isGameTerminated()) {
            let traversal
            let oldCellContent
            const vector = this.getVector(key)
            const traversals = this.buildTraversals(vector)
            let somethingMoved = false
            this.prepareTiles()
            traversals.x.forEach(traversalX => {
                traversals.y.forEach(traversalY => {
                    traversal = { x: traversalX, y: traversalY }
                    oldCellContent = this.grid.cellContent(traversal)
                    if (oldCellContent) {
                        const farthestPosition = this.findFarthestPosition(traversal, vector)
                        const nextCellContent = this.grid.cellContent(farthestPosition.next)
                        if (nextCellContent && nextCellContent.value === oldCellContent.value && !nextCellContent.mergedFrom) {
                            const newTile = new Tile(farthestPosition.next, 2 * oldCellContent.value)
                            newTile.mergedFrom = [oldCellContent, nextCellContent]
                            this.grid.insertTile(newTile)
                            this.grid.removeTile(oldCellContent)
                            oldCellContent.updatePosition(farthestPosition.next)
                            this.score += newTile.value
                            if (2048 === newTile.value) this.won = true
                        } else this.moveTile(oldCellContent, farthestPosition.farthest)
                        if (!this.positionsEqual(traversal, oldCellContent)) somethingMoved = true
                    }
                })
            })
            if (somethingMoved) {
                this.addRandomTile()
                if (!this.movesAvailable()) {
                    this.over = true
                }
            }
            this.actuate()
        }
    }

    /**
     * Gets the vector for the given direction
     * @param key {0|1|2|3} the direction
     * @returns {{x: *, y: *}} the vector
     */
    getVector = key => {
        return {
            0: { x: 0, y: - 1 },
            1: { x: 1, y: 0 },
            2: { x: 0, y: 1 },
            3: { x: - 1, y: 0 }
        }[key]
    }

    /**
     * Builds the traversals for the given vector
     * @param vector {{x: *, y: *}} the vector
     * @returns {{x: *[], y: *[]}} the traversals
     */
    buildTraversals = vector => {
        const traversals = { x: [], y: [] }
        for (let i = 0; i < this.size; i ++) {
            traversals.x.push(i)
            traversals.y.push(i)
        }
        1 === vector.x && (traversals.x = traversals.x.reverse())
        1 === vector.y && (traversals.y = traversals.y.reverse())
        return traversals
    }

    /**
     * Finds the farthest position for a tile in a given direction
     * and returns the farthest position and the next position
     * @param cell {{x: *, y: *}} the cell
     * @param vector {{x: *, y: *}} the direction vector
     * @returns {{next: {x: *, y: *}, farthest}} the farthest position and the next position
     */
    findFarthestPosition = (cell, vector) => {
        let res
        do {
            cell = { x: (res = cell).x + vector.x, y: res.y + vector.y }
        } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell))
        return { farthest: res, next: cell }
    }

    /**
     * Checks if there are still moves available
     * @returns {boolean|*} true if there are still moves available, false otherwise
     */
    movesAvailable = () => this.grid.cellsAvailable() || this.tileMatchesAvailable()

    /**
     * Checks if there are still tile matches available
     * @returns {boolean} true if there are still tile matches available, false otherwise
     */
    tileMatchesAvailable = () => {
        let tile
        for (let i = 0; i < this.size; i ++) {
            for (let j = 0; j < this.size; j ++) {
                tile = this.grid.cellContent({ x: i, y: j })
                if (tile) {
                    for (let key = 0; key < 4; key ++) {
                        const vector = this.getVector(key)
                        const nextCell = { x: i + vector.x, y: j + vector.y }
                        const nextTile = this.grid.cellContent(nextCell)
                        if (nextTile && nextTile.value === tile.value) return true
                    }
                }
            }
        }
        return false
    }

    /**
     * Checks if two positions are equal
     * @param cell1 {{x: *, y: *}} the first position
     * @param cell2 {{x: *, y: *}} the second position
     * @returns {boolean} true if the positions are equal, false otherwise
     */
    positionsEqual = (cell1, cell2) => cell1.x === cell2.x && cell1.y === cell2.y
}

function runApplication() {
    new GameManager(4, new KeyboardInputManager(), new HTMLActuator(), new LocalStorageManager())
    // const e = new LocalStorageManager
    // t = document.querySelector(".cookie-notice")
    // i = document.querySelector(".cookie-notice-dismiss-button")
    // var o = document.querySelector(".how-to-play-link")
    // n = document.querySelector(".game-explanation")
    // o && n && o.addEventListener("click", (function () {
    //     n.scrollIntoView({ behavior: "smooth", block: "center" })
    //     n.addEventListener("animationend", (function () {
    //         n.classList.remove("game-explanation-highlighted")
    //     }))
    //     n.classList.add("game-explanation-highlighted")
    // }))
    // var a = document.querySelector(".start-playing-link")
    // r = document.querySelector(".game-container")
    // a && r && a.addEventListener("click", (function () {
    //     r.scrollIntoView({ behavior: "smooth", block: "center" })
    // }))
}

/*Function.prototype.bind = Function.prototype.bind || function (e) {
    var t = this
    return function (i) {
        i instanceof Array || (i = [i])
        t.apply(e, i)
    }
}, function () {
    if (void 0 !== window.Element && !("classList" in document.documentElement)) {
        var e, t, i, o = Array.prototype, n = o.push, a = o.splice, r = o.join
        s.prototype = {
            add: function (e) {
                this.contains(e) || (n.call(this, e), this.el.className = this.toString())
            }, contains: function (e) {
                return - 1 != this.el.className.indexOf(e)
            }, item: function (e) {
                return this[e] || null
            }, remove: function (e) {
                if (this.contains(e)) {
                    for (var t = 0; t < this.length && this[t] != e; t ++)
                        a.call(this, t, 1), this.el.className = this.toString()
                }
            }, toString: function () {
                return r.call(this, " ")
            }, toggle: function (e) {
                return this.contains(e) ? this.remove(e) : this.add(e), this.contains(e)
            }
        }, window.DOMTokenList = s, e = HTMLElement.prototype, t = "classList", i = function () {
            return new s(this)
        }, Object.defineProperty ? Object.defineProperty(e, t, { get: i }) : e.__defineGetter__(t, i)
    }

    function s(e) {
        this.el = e
        for (var t = e.className.replace(/^\s+|\s+$/g, "").split(/\s+/), i = 0; i < t.length; i ++) n.call(this, t[i])
    }

}(), function () {
    for (var e = 0, t = ["webkit", "moz"], i = 0; i < t.length && !window.requestAnimationFrame; ++ i) window.requestAnimationFrame = window[t[i] + "RequestAnimationFrame"], window.cancelAnimationFrame = window[t[i] + "CancelAnimationFrame"] || window[t[i] + "CancelRequestAnimationFrame"]
    window.requestAnimationFrame || (window.requestAnimationFrame = function (t) {
        var i = (new Date).getTime(), o = Math.max(0, 16 - (i - e)), n = window.setTimeout((function () {
            t(i + o)
        }), o)
        return e = i + o, n
    }), window.cancelAnimationFrame || (window.cancelAnimationFrame = function (e) {
        clearTimeout(e)
    })
}()
*/

window.fakeStorage = {
    _data: {}, setItem: function (e, t) {
        return this._data[e] = String(t)
    }, getItem: function (e) {
        return this._data.hasOwnProperty(e) ? this._data[e] : void 0
    }, removeItem: function (e) {
        return delete this._data[e]
    }, clear: function () {
        return this._data = {}
    }
}
window.requestAnimationFrame(() => {
    if (undefined !== window.PokiSDK) {
        PokiSDK.init().then(() => {
            PokiSDK.gameLoadingStart()
            PokiSDK.gameLoadingProgress({ percentageDone: 1 })
            PokiSDK.gameLoadingFinished()
            runApplication()
        }).catch(() => {
            runApplication()
        })
    } else {
        runApplication()
    }
})

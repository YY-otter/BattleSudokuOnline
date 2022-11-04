self.addEventListener("message", (message) => {
  console.log("calcPatterns catch message:", message.data);
  assignMessageToFunc(message.data);
}, false);

class Message {
  constructor(funcName, valueArray) {
    this.funcName = funcName;
    this.valueArray = valueArray;
  }
}

const BOARD_SIZE_LIST = [4, 6];

let allAnswerPattern = { 4: [], 6: [] };

let answerPatternInitialized = false;

let boardSize = 4;

let gameBoard = [];
let gameRecord = [];

let maxAnswerPattern = 12;

let temporaryAnswerPattern = maxAnswerPattern;
let temporaryAnswerPatternFlag = new Array(temporaryAnswerPattern).fill(true);
let temporaryFirstFilledNumPosition = new Array(boardSize).fill({ y: 0, x: 0 });
let temporaryUnfilledNum = boardSize;
let temporaryTotalAnswerPattern = temporaryAnswerPattern * factorialize(temporaryUnfilledNum);
let temporaryY = 0;
let temporaryX = 0;
let temporaryNum = 0;

let remainAnswerPattern = temporaryAnswerPattern;
let remainAnswerPatternFlag = [...temporaryAnswerPatternFlag];
let remainFirstFilledNumPosition = [...temporaryFirstFilledNumPosition];
let remainUnfilledNum = temporaryUnfilledNum;
let remainTotalAnswerPattern = temporaryTotalAnswerPattern;

let decideNumIntervalByCPU;
let decideNumFlagByCPU;

function assignMessageToFunc(message) {
  switch (message.funcName) {
    case "calcAllPatterns":
      console.log('calcPatterns do "calcAllPatterns"');
      calcAllPatterns(message.valueArray);
      break;
    case "resetGame":
      console.log('calcPatterns do "resetGame"');
      resetGame(message.valueArray);
      break;
    case "setPositionedNum":
      console.log('calcPatterns do "setPositionedNum"');
      setPositionedNum(message.valueArray);
      break;
    case "guestPositionedNum":
      console.log('calcPatterns do "guestPositionedNum"');
      guestPositionedNum(message.valueArray);
      break;
    case "decideNum":
      console.log('calcPatterns do "decideNum"');
      decideNum(message.valueArray);
      break;
    case "playByCPU":
      console.log('calcPatterns do "playByCPU"');
      playByCPU(message.valueArray);
      break;
    default:
      throw new Error("Unexpected function name");
  }
}

/* https://qiita.com/devmynote/items/017ca6c32dd1e45be4b9 */
function calcAllPatterns() {
  for (let calcAnswerBoardSize of BOARD_SIZE_LIST) {
    const WIDTH = calcAnswerBoardSize;
    const HEIGHT = calcAnswerBoardSize;
    const BLOCK_HEIGHT = Math.floor(Math.sqrt(calcAnswerBoardSize));
    const BLOCK_WIDTH = calcAnswerBoardSize / BLOCK_HEIGHT;

    let workBoard = new Array(HEIGHT);
    for (let y = 0; y < HEIGHT; y++) {
      workBoard[y] = new Array(WIDTH).fill(0);
    }
    for (let x = 0; x < WIDTH; x++) {
      workBoard[0][x] = x + 1;
    }

    let dupRow = new Array(WIDTH);
    for (let x = 0; x < WIDTH; x++) {
      dupRow[x] = new Array(calcAnswerBoardSize).fill(false);
    }

    let dupColumn = new Array(HEIGHT);
    for (let y = 0; y < HEIGHT; y++) {
      dupColumn[y] = new Array(calcAnswerBoardSize).fill(false);
    }

    let dupBlock = new Array(calcAnswerBoardSize / BLOCK_HEIGHT);
    for (let y = 0; y < calcAnswerBoardSize / BLOCK_HEIGHT; y++) {
      dupBlock[y] = new Array(calcAnswerBoardSize / BLOCK_WIDTH);
      for (let x = 0; x < calcAnswerBoardSize / BLOCK_WIDTH; x++) {
        dupBlock[y][x] = new Array(calcAnswerBoardSize).fill(false);
      }
    }

    function judgeNumPosition(x, y, num) {
      if (dupRow[y][num] === false && dupColumn[x][num] === false && dupBlock[Math.floor(y / BLOCK_HEIGHT)][Math.floor(x / BLOCK_WIDTH)][num] === false) {
        workBoard[y][x] = num + 1;
        dupRow[y][num] = true;
        dupColumn[x][num] = true;
        dupBlock[Math.floor(y / BLOCK_HEIGHT)][Math.floor(x / BLOCK_WIDTH)][num] = true;
        return (true);
      }
      return (false);
    }

    function deleteNumPosition(x, y, num) {
      workBoard[y][x] = 0;
      dupRow[y][num] = false;
      dupColumn[x][num] = false;
      dupBlock[Math.floor(y / BLOCK_HEIGHT)][Math.floor(x / BLOCK_WIDTH)][num] = false;
    }

    function judgeContinueToFill(x, y) {
      if (x === HEIGHT - 1) {
        if (y === WIDTH - 1) {
          allAnswerPattern[calcAnswerBoardSize].push(JSON.parse(JSON.stringify(workBoard)));

          return (false);
        }
        else {
          return ("y");
        }
      }
      else {
        return ("x");
      }
    }

    function solve(x, y) {
      if (workBoard[y][x] > 0) {
        switch (judgeContinueToFill(x, y)) {
          case "x":
            solve(x + 1, y);
            break;

          case "y":
            solve(0, y + 1);
            break;

          default:
        }
      }
      else {
        for (let n = 0; n < calcAnswerBoardSize; n++) {
          if (judgeNumPosition(x, y, n)) {
            switch (judgeContinueToFill(x, y)) {
              case "x":
                solve(x + 1, y);
                break;

              case "y":
                solve(0, y + 1);
                break;

              default:
            }
            deleteNumPosition(x, y, n);
          }
        }
      }
    }

    for (let y = 0; y < WIDTH; y++) {
      for (let x = 0; x < HEIGHT; x++) {
        if (workBoard[y][x] > 0) {
          if (judgeNumPosition(x, y, workBoard[y][x] - 1) === false) {
            throw new Error("Unexpected board initialize");
          }
        }
      }
    }

    solve(0, 0);
  }

  const postMessage = new Message("returnFromCalcAllPatterns", null);
  self.postMessage(postMessage);
}

function resetGame(valueArray) {
  clearInterval(decideNumIntervalByCPU);

  boardSize = valueArray.boardSize;

  maxAnswerPattern = allAnswerPattern[boardSize].length;

  gameBoard = new Array(boardSize);
  for (let y = 0; y < boardSize; y++) {
    gameBoard[y] = new Array(boardSize).fill(0);
  }
  gameRecord = [];

  temporaryAnswerPattern = maxAnswerPattern;
  temporaryAnswerPatternFlag = new Array(temporaryAnswerPattern).fill(true);
  temporaryFirstFilledNumPosition = new Array(boardSize).fill({ y: 0, x: 0 });
  temporaryUnfilledNum = boardSize;
  temporaryTotalAnswerPattern = temporaryAnswerPattern * factorialize(temporaryUnfilledNum);

  temporaryY = 0;
  temporaryX = 0;
  temporaryNum = 0;

  updateAnswerPattern(false);

  if (valueArray.postFlag) {
    const postResetGame = new Message("returnFromResetGame", remainTotalAnswerPattern);
    self.postMessage(postResetGame);
  }
}

function setPositionedNum() {
  const RANDOM_ADD = Math.floor(Math.random() * 2);
  let setNum = boardSize + RANDOM_ADD - 2;
  let resetFlag = false;

  while (setNum > 0) {
    const INITIAL_TEMP_Y = Math.floor(Math.random() * boardSize) + 1;
    const INITIAL_TEMP_X = Math.floor(Math.random() * boardSize) + 1;
    const INITIAL_TEMP_NUM = Math.floor(Math.random() * boardSize) + 1;

    if (gameBoard[INITIAL_TEMP_Y - 1][INITIAL_TEMP_X - 1] === 0 && searchAnswerPattern(INITIAL_TEMP_Y, INITIAL_TEMP_X, INITIAL_TEMP_NUM) > 0) {
      updateAnswerPattern(false);
      setNum--;
    }

    if (setNum === 0 && boardSize === 4 && RANDOM_ADD === 1) {
      for (let checkY = 1; checkY <= boardSize; checkY++) {
        for (let checkX = 1; checkX <= boardSize; checkX++) {
          for (let checkNum = 1; checkNum <= boardSize; checkNum++) {
            if (gameBoard[checkY - 1][checkX - 1] === 0 && searchAnswerPattern(checkY, checkX, checkNum) === 1) {
              resetFlag = true;
            }
          }
        }
      }
    }

    if (resetFlag) {
      resetGame({ boardSize: boardSize, postFlag: false });
      setNum = boardSize + RANDOM_ADD - 2;
      resetFlag = false;
    }
  }

  const postPositionedNum = new Message("returnFromPositionedNum", { gameRecord: gameRecord, answerPattern: remainTotalAnswerPattern });
  self.postMessage(postPositionedNum);
}

function guestPositionedNum(valueArray) {
  for (let posAndNum of valueArray.gameRecord) {
    searchAnswerPattern(posAndNum.y, posAndNum.x, posAndNum.num);
    updateAnswerPattern(false);
  }

  const postPositionedNum = new Message("returnFromPositionedNum", { gameRecord: gameRecord, answerPattern: remainTotalAnswerPattern });
  self.postMessage(postPositionedNum);
}

function decideNum(posAndNumArray) {
  searchAnswerPattern(posAndNumArray.y, posAndNumArray.x, posAndNumArray.num);
  updateAnswerPattern(true);
}

function playByCPU(CPUlevel) {
  decideNumIntervalByCPU = setInterval("decideNumByCPU()", 1000);

  const START_TIME = performance.now();

  decideNumFlagByCPU = false;
  let judgeCounter = 0;

  while (!(decideNumFlagByCPU)) {
    const CPU_TEMP_Y = Math.floor(Math.random() * boardSize) + 1;
    const CPU_TEMP_X = Math.floor(Math.random() * boardSize) + 1;
    const CPU_TEMP_NUM = Math.floor(Math.random() * boardSize) + 1;

    console.log("CPU selected:", CPU_TEMP_Y, CPU_TEMP_X, CPU_TEMP_NUM);

    if (gameBoard[CPU_TEMP_Y - 1][CPU_TEMP_X - 1] === 0) {
      const CHECK_ANSWER_PATTERN = searchAnswerPattern(CPU_TEMP_Y, CPU_TEMP_X, CPU_TEMP_NUM);

      switch (CPUlevel) {
        case 1:
          judgeCounter = 0;
          const BLOCK_COL = Math.floor(Math.sqrt(boardSize));
          const BLOCK_ROW = boardSize / BLOCK_COL;
          let x;
          let y;

          for (x = 0; x < boardSize; x++) {
            if (gameBoard[CPU_TEMP_Y - 1][x] === CPU_TEMP_NUM) {
              judgeCounter++;
            }
          }
          for (y = 0; y < boardSize; y++) {
            if (gameBoard[y][CPU_TEMP_X - 1] === CPU_TEMP_NUM) {
              judgeCounter++;
            }
          }

          const BLOCK_LEFT_UPPER = {
            Y: Math.ceil(CPU_TEMP_Y / BLOCK_COL) * BLOCK_COL - 1,
            X: Math.ceil(CPU_TEMP_X / BLOCK_ROW) * BLOCK_ROW - 1
          }

          for (y = BLOCK_LEFT_UPPER.Y - 1; y < BLOCK_LEFT_UPPER.Y + BLOCK_COL - 2; y++) {
            for (x = BLOCK_LEFT_UPPER.X - 1; x < BLOCK_LEFT_UPPER.X + BLOCK_ROW - 2; x++) {
              if (gameBoard[y][x] === CPU_TEMP_NUM) {
                judgeCounter++;
              }
            }
          }

          if (judgeCounter === 0) {
            decideNumFlagByCPU = true;
          }

          break;

        case 2:
          if (CHECK_ANSWER_PATTERN !== 0 && CHECK_ANSWER_PATTERN !== remainAnswerPattern) {
            decideNumFlagByCPU = true;
          }

          break;

        case 3:
          if (CHECK_ANSWER_PATTERN >= 2 && CHECK_ANSWER_PATTERN < boardSize) {
            if (judgeCounter >= 25) {
              decideNumFlagByCPU = true;
            }
            else {
              judgeCounter++;
              console.log("judgeCounter:", judgeCounter);
            }
          }
          else if (CHECK_ANSWER_PATTERN === remainAnswerPattern) {
            if (judgeCounter >= 15) {
              decideNumFlagByCPU = true;
            }
            else {
              judgeCounter++;
              console.log("judgeCounter:", judgeCounter);
            }
          }
          else if (CHECK_ANSWER_PATTERN !== 0) {
            decideNumFlagByCPU = true;
          }

          break;

        default:
          throw new Error("Unexpected game mode");
      }
    }
  }

  const END_TIME = performance.now();
  console.log("CPU think:", (END_TIME - START_TIME).toFixed(1) + "ms");
}

function decideNumByCPU() {
  if (decideNumFlagByCPU) {
    clearInterval(decideNumIntervalByCPU);

    const postPosAndNum = new Message("returnFromDecideNumByCPU", { y: temporaryY, x: temporaryX, num: temporaryNum });
    self.postMessage(postPosAndNum);
    updateAnswerPattern(true);
  }
}

function searchAnswerPattern(y, x, num) {
  temporaryAnswerPattern = remainAnswerPattern;
  temporaryAnswerPatternFlag = [...remainAnswerPatternFlag];
  for (const [index, value] of remainFirstFilledNumPosition.entries()) {
    temporaryFirstFilledNumPosition[index] = Object.assign(value);
  }
  temporaryUnfilledNum = remainUnfilledNum;
  temporaryTotalAnswerPattern = remainTotalAnswerPattern;
  temporaryY = y;
  temporaryX = x;
  temporaryNum = num;

  if (temporaryFirstFilledNumPosition[temporaryNum - 1].y === 0) {
    temporaryFirstFilledNumPosition[temporaryNum - 1] = { y: temporaryY, x: temporaryX };
    temporaryUnfilledNum--;

    for (let i = 0; i < maxAnswerPattern; i++) {
      if (temporaryAnswerPatternFlag[i]) {
        for (let j = 0; j < boardSize; j++) {
          if (j !== temporaryNum - 1 && temporaryFirstFilledNumPosition[j].y !== 0 && allAnswerPattern[boardSize][i][temporaryFirstFilledNumPosition[j].y - 1][temporaryFirstFilledNumPosition[j].x - 1] === allAnswerPattern[boardSize][i][temporaryFirstFilledNumPosition[temporaryNum - 1].y - 1][temporaryFirstFilledNumPosition[temporaryNum - 1].x - 1]) {
            temporaryAnswerPatternFlag[i] = false;
            temporaryAnswerPattern--;
            break;
          }
        }
      }
    }
  }
  else {
    for (let i = 0; i < maxAnswerPattern; i++) {
      if (temporaryAnswerPatternFlag[i]) {
        if (allAnswerPattern[boardSize][i][temporaryFirstFilledNumPosition[temporaryNum - 1].y - 1][temporaryFirstFilledNumPosition[temporaryNum - 1].x - 1] !== allAnswerPattern[boardSize][i][temporaryY - 1][temporaryX - 1]) {
          temporaryAnswerPatternFlag[i] = false;
          temporaryAnswerPattern--;
        }
      }
    }
  }

  temporaryTotalAnswerPattern = temporaryAnswerPattern * factorialize(temporaryUnfilledNum);

  console.log(temporaryFirstFilledNumPosition, temporaryUnfilledNum, temporaryAnswerPattern, temporaryTotalAnswerPattern);

  return temporaryTotalAnswerPattern;
}

function updateAnswerPattern(postAnswerPatternFlag) {
  if (temporaryY !== 0) {
    gameBoard[temporaryY - 1][temporaryX - 1] = temporaryNum;
    gameRecord.push({ y: temporaryY, x: temporaryX, num: temporaryNum });
  }

  console.log(gameBoard, gameRecord);

  remainAnswerPattern = temporaryAnswerPattern;
  remainAnswerPatternFlag = [...temporaryAnswerPatternFlag];
  for (const [index, value] of temporaryFirstFilledNumPosition.entries()) {
    remainFirstFilledNumPosition[index] = Object.assign(value);
  }
  remainUnfilledNum = temporaryUnfilledNum;
  remainTotalAnswerPattern = temporaryTotalAnswerPattern;
  temporaryY = 0;
  temporaryX = 0;
  temporaryNum = 0;

  if (postAnswerPatternFlag) {
    const postAnswerPattern = new Message("returnFromUpdateAnswerPattern", remainTotalAnswerPattern);
    self.postMessage(postAnswerPattern);
  }
}

function factorialize(n) {
  let num = Math.floor(n);
  let ans = 1;

  for (let i = 1; i <= num; i++) {
    ans *= i;
  }

  return ans;
}
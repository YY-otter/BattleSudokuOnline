const socket = io();

socket.on('connect', function() {
  socket.headbeatTimeout = 5000;
});

const calcPatternsWorker = new Worker("./js/calcPatterns.js");

const h1TitleElem = document.getElementById("h1Title");

const divContentsElem = document.getElementById("divContents");

const divBoardElem = document.getElementById("divBoard");
const tableBoardElem = document.getElementById("tableBoard");

const divInfoElem = document.getElementById("divInfo");
const patternNumElem = document.getElementById("patternNum");
const pSelectNumElem = document.getElementById("pSelectNum");
const selectedPosElem = document.getElementById("selectedPos");
const selectedNumElem = document.getElementById("selectedNum");
const viewResultElem = document.getElementById("viewResult");

const detailsOptionsElem = document.getElementById("detailsOptions");
const resetAttensionElem = document.getElementById("resetAttension");
const viewAnswerPatternElem = document.getElementById("viewAnswerPattern");
const boardSizeElems = document.getElementsByName("boardSize");
const positionedNumElems = document.getElementsByName("positionedNum");
const playTurnElems = document.getElementsByName("playTurn");
const roomIDElem = document.getElementById("roomID");

let resetedFlag = false;
let playableFlag = false;
let playerTurnFlag = true;
let playerNum = 1;
let playerTurnNum = 0;
let boardSize = 4;
let answerPattern = 288;
let selectedPos = { y: 0, x: 0 };
let selectedNum = 0;
let setPositionedNumFlag = false;
let viewAnswerPatternFlag = true;
let roomID = "";
let gameReadyFlag = false;
let hostFlag = false;
let startTime;
let endTime;
let guestPositionedNumData = "";

class Message {
  constructor(funcName, valueArray) {
    this.funcName = funcName;
    this.valueArray = valueArray;
  }
}

/* https://stackoverflow.com/questions/901115/#901144 */
function getParam(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

calcPatternsWorker.addEventListener("message", (message) => {
  console.log("main catch message:", message.data);
  assignMessageToFunc(message.data);
}, false);

window.onload = function() {
  playableFlag = false;
  gameReadyFlag = false;

  viewAnswerPatternElem.checked = true;
  boardSizeElems[0].checked = true;
  positionedNumElems[1].checked = true;
  playTurnElems[0].checked = true;

  let tempRoomID = "";

  if (getParam("room_id")) {
    tempRoomID = getParam("room_id");
  }
  else {
    let length = 8;
    let characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    tempRoomID = "";

    for (let i = 0; i < length; i++) {
      tempRoomID += characters[Math.floor(Math.random() * characters.length)];
    }
  }

  roomIDElem.value = tempRoomID;

  document.documentElement.style.setProperty("--board-td-line-height", "0");
  adjustBoardSize();

  startTime = performance.now();

  const postCalcAllPatterns = new Message("calcAllPatterns", null);
  calcPatternsWorker.postMessage(postCalcAllPatterns);
}

window.onresize = function() {
  adjustBoardSize();
}

detailsOptionsElem.ontoggle = function() {
  adjustBoardSize();
}

function selectPos(y, x) {
  if (tableBoardElem.rows[y].cells[x].innerHTML === "" && playableFlag && gameReadyFlag && playerTurnFlag) {
    selectedPos = { y: y, x: x };
    updateSelectedInfo();
  }
}

function selectNum(n) {
  if (playableFlag && gameReadyFlag && playerTurnFlag) {
    selectedNum = n;
    updateSelectedInfo();
  }
}

function decideNum() {
  if (selectedNum !== 0 && selectedPos.y !== 0 && playableFlag && gameReadyFlag && playerTurnFlag) {
    socket.emit("postNum", { y: selectedPos.y, x: selectedPos.x, num: selectedNum });
  }
}

function cancelNum(flag) {
  if ((playableFlag && gameReadyFlag && playerTurnFlag) || flag) {
    selectedPos = { y: 0, x: 0 };
    selectedNum = 0;
    updateSelectedInfo();
  }
}

function resetButton() {
  if (gameReadyFlag === hostFlag) { resetGame(); }

  if (roomIDElem.value.length >= 4 && roomIDElem.value.length <= 8) {
    roomID = roomIDElem.value;

    socket.emit("joinRoom", roomID);

    resetAttensionElem.innerHTML = "...";
    resetAttensionElem.style.color = "#000";
  }
}

function resetGame() {
  if (resetedFlag) {
    resetedFlag = false;
    playableFlag = false;

    let i;
    let j;

    for (i in boardSizeElems) {
      if (boardSizeElems[i].checked) {
        boardSize = parseInt(boardSizeElems[i].value);
        break;
      }
    }
    for (i in positionedNumElems) {
      if (positionedNumElems[i].checked) {
        setPositionedNumFlag = Boolean(parseInt(positionedNumElems[i].value));
        break;
      }
    }
    for (i in playTurnElems) {
      if (playTurnElems[i].checked) {
        playerTurnNum = parseInt(playTurnElems[i].value);
        break;
      }
    }

    switch (boardSize) {
      case 4:
        document.documentElement.style.setProperty("--board-td-font-size", "300%");
        break;

      case 6:
        document.documentElement.style.setProperty("--board-td-font-size", "200%");
        break;

      default:
        throw new Error("Unexpected board size");
    }

    startTime = performance.now();
    const postResetGame = new Message("resetGame", { boardSize: boardSize, postFlag: true });
    calcPatternsWorker.postMessage(postResetGame);

    while (tableBoardElem.firstChild) {
      tableBoardElem.removeChild(tableBoardElem.firstChild);
    }

    const newTh = document.createElement("th");

    for (i = 0; i <= boardSize; i++) {
      const newRow = tableBoardElem.insertRow(-1);

      for (j = 0; j <= boardSize; j++) {
        if (i === 0) {
          if (j !== 0) {
            newTh.innerHTML = String.fromCharCode(j + 64);
          }

          newRow.appendChild(newTh.cloneNode(true));
        }
        else {
          if (j === 0) {
            newTh.innerHTML = i;
            newRow.appendChild(newTh.cloneNode(true));
          }
          else {
            const newCell = newRow.insertCell(-1);

            newCell.setAttribute("onclick", "selectPos(" + i + ", " + j + ")");
          }
        }
      }
    }

    while (pSelectNumElem.firstChild) {
      pSelectNumElem.removeChild(pSelectNumElem.firstChild);
    }

    for (i = 1; i <= boardSize; i++) {
      const newButton = document.createElement("button");

      newButton.innerHTML = i;
      newButton.setAttribute("onclick", "selectNum(" + i + ")");

      pSelectNumElem.appendChild(newButton.cloneNode(true));
    }

    patternNumElem.style.color = "#000";
    cancelNum(true);
    viewResultElem.innerHTML = "Just a moment...";
    viewResultElem.style.color = "#000";
    resetAttensionElem.innerHTML = "...";
    resetAttensionElem.style.color = "#000";
    adjustBoardSize();

    playerNum = 2;
  }
}

function changeOption() {
  resetAttensionElem.innerHTML = "Press &quot;Reset&quot;";
  resetAttensionElem.style.color = "#e00";
}

function viewAnswerPattern(flag) {
  viewAnswerPatternFlag = flag;
  changePatternNum();

  socket.emit("postViewAnswerPatternFlag", viewAnswerPatternFlag);
}

function viewRoomID(flag) {
  if (flag) {
    roomIDElem.style = "";
  }
  else {
    roomIDElem.style = "-webkit-text-security:disc;";
  }
}

function assignMessageToFunc(message) {
  switch (message.funcName) {
    case "returnFromCalcAllPatterns":
      console.log('main do "returnFromCalcAllPatterns"');
      returnFromCalcAllPatterns(message.valueArray);
      break;
    case "returnFromResetGame":
      console.log('main do "returnFromResetGame"');
      returnFromResetGame(message.valueArray);
      break;
    case "returnFromPositionedNum":
      console.log('main do "returnFromPositionedNum"');
      returnFromPositionedNum(message.valueArray);
      break;
    case "returnFromUpdateAnswerPattern":
      console.log('main do "returnFromUpdateAnswerPattern"');
      returnFromUpdateAnswerPattern(message.valueArray);
      break;
    case "returnFromDecideNumByCPU":
      console.log('main do "returnFromDecideNumByCPU"');
      returnFromDecideNumByCPU(message.valueArray);
      break;

    default:
      throw new Error("Unexpected function name");
  }
}

function returnFromCalcAllPatterns() {
  endTime = performance.now();
  console.log("initialize:", (endTime - startTime).toFixed(1) + "ms");

  resetedFlag = true;
  resetButton();
}

function returnFromResetGame(answerPatternNum) {
  answerPattern = answerPatternNum;
  changePatternNum();

  endTime = performance.now();
  console.log("gameReset:", (endTime - startTime).toFixed(1) + "ms");

  if (setPositionedNumFlag) {
    if (hostFlag) {
      startTime = performance.now();
      const postSetPositionedNum = new Message("setPositionedNum", null);
      calcPatternsWorker.postMessage(postSetPositionedNum);
    }
    else {
      const postGuestPositionedNum = new Message("guestPositionedNum", guestPositionedNumData);
      calcPatternsWorker.postMessage(postGuestPositionedNum);
    }
  }
  else {
    changeTurn();
    adjustBoardSize();
    resetedFlag = true;
    if (hostFlag) {
      socket.emit("postGameSettings", {
        viewAnswerPatternFlag: viewAnswerPatternFlag,
        boardSize: boardSize,
        positionedNum: "",
        playerTurnNum: playerTurnNum
      });
    }
  }
}

function returnFromPositionedNum(valueArray) {
  for (let posAndNum of valueArray.gameRecord) {
    tableBoardElem.rows[posAndNum.y].cells[posAndNum.x].innerHTML = posAndNum.num;
  }

  answerPattern = valueArray.answerPattern;
  changePatternNum();

  changeTurn();
  adjustBoardSize();
  resetedFlag = true;

  if (hostFlag) {
    socket.emit("postGameSettings", {
      viewAnswerPatternFlag: viewAnswerPatternFlag,
      boardSize: boardSize,
      positionedNum: valueArray,
      playerTurnNum: playerTurnNum
    });
  }
}

function returnFromUpdateAnswerPattern(answerPatternNum) {
  answerPattern = answerPatternNum;
  changePatternNum();

  endTime = performance.now();
  console.log("updateAnswerPattern:", (endTime - startTime).toFixed(1) + "ms");

  judgeGameEnd();
}

function returnFromDecideNumByCPU(posAndNumArray) {
  if (posAndNumArray.y === 0) {
    throw new Error("Unexpected position and number");
  }
  tableBoardElem.rows[posAndNumArray.y].cells[posAndNumArray.x].innerHTML = posAndNumArray.num;

  selectedPos = { y: posAndNumArray.y, x: posAndNumArray.x };
  selectedNum = posAndNumArray.num;
  updateSelectedInfo();
}

function adjustBoardSize() {
  const divContentsWidth = divContentsElem.getBoundingClientRect().width;
  const divContentsHeight = divContentsElem.getBoundingClientRect().height;
  const divInfoWidth = divInfoElem.getBoundingClientRect().width;
  const divInfoHeight = divInfoElem.getBoundingClientRect().height;

  let boardDisplayAreaSize;

  const boardFontSizeRatio = 0.05;

  if (divContentsWidth - divInfoWidth > divContentsHeight - divInfoHeight) {
    divContentsElem.style.flexDirection = "row";
    divContentsElem.style.justifyContent = "center";

    boardDisplayAreaSize = Math.min(divContentsHeight, divContentsWidth - divInfoWidth);
  }
  else {
    divContentsElem.style.flexDirection = "column";
    divContentsElem.style.justifyContent = "flex-start";

    boardDisplayAreaSize = Math.min(divContentsWidth, divContentsHeight - divInfoHeight);
  }

  divBoardElem.style.width = boardDisplayAreaSize + "px";
  divBoardElem.style.height = boardDisplayAreaSize + "px";

  tableBoardElem.style.fontSize = boardDisplayAreaSize * boardFontSizeRatio + "px";
}

function updateSelectedInfo() {
  let y;
  let x;

  for (y = 1; y <= boardSize; y++) {
    for (x = 1; x <= boardSize; x++) {
      tableBoardElem.rows[y].cells[x].style.boxShadow = "";
    }
  }

  if (selectedPos.y === 0) {
    selectedPosElem.innerHTML = "??";
  }
  else {
    selectedPosElem.innerHTML = String.fromCharCode(selectedPos.x + 64) + selectedPos.y;
    tableBoardElem.rows[selectedPos.y].cells[selectedPos.x].style.boxShadow = "0 0 0 0.1em #e00 inset";
  }

  if (selectedNum === 0) {
    selectedNumElem.innerHTML = "?";
  }
  else {
    selectedNumElem.innerHTML = selectedNum;
  }
}

function changePatternNum() {
  if (viewAnswerPatternFlag || answerPattern <= 1) {
    patternNumElem.innerHTML = answerPattern;
  }
  else {
    patternNumElem.innerHTML = "???";
  }
}

function judgeGameEnd() {
  if (answerPattern <= 1) {
    switch (answerPattern) {
      case 1:
        patternNumElem.style.color = "#e00";
        break;

      case 0:
        patternNumElem.style.color = "#00e";
        break;

      default:
        throw new Error("Unexpected answer pattern(fewer than are necessary)");
    }

    if (Boolean(answerPattern) === playerTurnFlag) {
      viewResultElem.innerHTML = "YOU WIN!!!";
      viewResultElem.style.color = "#e00";
    }
    else {
      viewResultElem.innerHTML = "YOU LOSE...";
      viewResultElem.style.color = "#00e";
    }

    playableFlag = false;
  }
  else {
    selectedPos = { y: 0, x: 0 };
    selectedNum = 0;

    playerTurnNum++;

    changeTurn();
  }

  adjustBoardSize();
}

function changeTurn() {
  if (roomIDElem.value.length >= 4 && roomIDElem.value.length <= 8) {
    playableFlag = true;

    if (playerTurnNum >= playerNum) {
      playerTurnNum = 0;
    }

    if (playerTurnNum === 0) {
      playerTurnFlag = true;
    }
    else {
      playerTurnFlag = false;
    }

    if (playerTurnFlag) {
      viewResultElem.innerHTML = "YOUR TURN";
    }
    else {
      viewResultElem.innerHTML = "Opponent's TURN";
    }
  }
  else {
    viewResultElem.innerHTML = "Change Room ID";
  }
}

function copyURL() {
  const pre = document.createElement("pre");

  pre.style.userSelect = "auto";
  pre.textContent = location.hostname + location.pathname + "?room_id=" + roomID;

  document.body.appendChild(pre);
  document.getSelection().selectAllChildren(pre);
  document.execCommand('copy');

  document.body.removeChild(pre);
}

socket.on("joinRoomResult", (param) => {
  console.log(param);
  if (param.success) {
    if (param.ready) {
      socket.emit("getHostFlag", "");
    }
    else {
      viewResultElem.innerHTML = "Waiting for an opponent...";
      viewResultElem.style.color = "#000";
      gameReadyFlag = false;
      playableFlag = false;
      hostFlag = true;
    }
  }
  else {
    viewResultElem.innerHTML = "Room is full";
    viewResultElem.style.color = "#000";
    gameReadyFlag = false;
    playableFlag = false;
  }
});

socket.on("resHostFlag", (flag) => {
  hostFlag = flag;
  console.log(hostFlag);
  gameReadyFlag = true;
  if (hostFlag) {
    viewResultElem.innerHTML = "You are host";
    viewAnswerPatternElem.disabled = false;
    boardSizeElems[0].disabled = false;
    boardSizeElems[1].disabled = false;
    positionedNumElems[0].disabled = false;
    positionedNumElems[1].disabled = false;
    playTurnElems[0].disabled = false;
    playTurnElems[1].disabled = false;
  }
  else {
    viewResultElem.innerHTML = "You are guest";
    viewAnswerPatternElem.disabled = true;
    boardSizeElems[0].disabled = true;
    boardSizeElems[1].disabled = true;
    positionedNumElems[0].disabled = true;
    positionedNumElems[1].disabled = true;
    playTurnElems[0].disabled = true;
    playTurnElems[1].disabled = true;
  }
});

socket.on("fetchGameSettings", (msg) => {
  viewAnswerPatternElem.checked = msg.viewAnswerPatternFlag;
  switch (msg.boardSize) {
    case 4:
      boardSizeElems[0].checked = true;
      break;

    case 6:
      boardSizeElems[1].checked = true;
      break;
  }
  if (msg.positionedNum === "") {
    positionedNumElems[1].checked = true;
  }
  else {
    positionedNumElems[0].checked = true;
    guestPositionedNumData = msg.positionedNum;
  }
  playTurnElems[Math.abs(msg.playerTurnNum - 1)].checked = true;

  resetGame();
});

socket.on("fetchViewAnswerPatternFlag", (msg) => {
  viewAnswerPatternElem.checked = msg;
  viewAnswerPatternFlag = msg;
  changePatternNum();
});

socket.on("fetchNum", (msg) => {
  tableBoardElem.rows[msg.y].cells[msg.x].innerHTML = msg.num;

  selectedPos = { y: msg.y, x: msg.x };
  selectedNum = msg.num;
  updateSelectedInfo();

  switch (boardSize) {
    case 4:
    case 6:
      viewResultElem.innerHTML = "Just a moment...";
      startTime = performance.now();
      const postDecideNum = new Message("decideNum", { y: msg.y, x: msg.x, num: msg.num });
      calcPatternsWorker.postMessage(postDecideNum);
      break;

    default:
      throw new Error("Unexpected board size");
  }
});

socket.on("leavePlayer", () => {
  viewResultElem.innerHTML = "Opponent disconnected";
  viewResultElem.style.color = "#000";
  gameReadyFlag = false;
  playableFlag = false;
  hostFlag = true;
  socket.emit("onHostFlag", "");
});

socket.on("reconnecting", () => {
  gameReadyFlag = false;
  playableFlag = false;
  hostFlag = false;
  viewResultElem.innerHTML = "You disconnected";
});
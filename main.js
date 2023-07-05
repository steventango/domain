const c = document.querySelector('canvas');
const ctx = c.getContext("2d");
const WIDTH = 1024 * window.devicePixelRatio;
const HEIGHT = 1024 * window.devicePixelRatio;
c.width = WIDTH;
c.height = HEIGHT;
ctx.fillStyle = "#fff";
ctx.fillRect(0, 0, WIDTH, HEIGHT);
ctx.translate(WIDTH / 2, HEIGHT / 2);
ctx.scale(1, -1);

const R = 1;

const TEXTFIELD_Fxy = new mdc.textField.MDCTextField(document.querySelector('.mdc-text-field#tf_fxy'));
const TEXTFIELD_xws = new mdc.textField.MDCTextField(document.querySelector('.mdc-text-field#tf_xws'));
const TEXTFIELD_yws = new mdc.textField.MDCTextField(document.querySelector('.mdc-text-field#tf_yws'));
const TEXTFIELD_nw = new mdc.textField.MDCTextField(document.querySelector('.mdc-text-field#tf_nw'));
const TEXTFIELD_np = new mdc.textField.MDCTextField(document.querySelector('.mdc-text-field#tf_np'));
const TEXTFIELD_Fxy_hint = document.querySelector('#tf_fxy_hint');
const BUTTON_restart = new mdc.ripple.MDCRipple(document.querySelector('.mdc-button#btn_restart'));
const BUTTON_download = new mdc.ripple.MDCRipple(document.querySelector('.mdc-button#btn_download'));
const LINEAR_PROGRESS = new mdc.linearProgress.MDCLinearProgress(document.querySelector('.mdc-linear-progress'));

const WORKERS = [];

let TOTAL = 2e5;
let DOMAIN = 10;
let RANGE = 10;
let XSCALE = WIDTH / DOMAIN;
let YSCALE = HEIGHT / RANGE;
let NUMBER_GRID_LINES = DOMAIN;
let N_WORKERS = navigator.hardwareConcurrency;
let points;
let request;
let f;

TEXTFIELD_Fxy.input.addEventListener('change', updatef);

TEXTFIELD_xws.value = DOMAIN;
TEXTFIELD_xws.input.addEventListener('change', () => {
  TEXTFIELD_xws.value = Math.max(TEXTFIELD_xws.value, 1);
  DOMAIN = TEXTFIELD_xws.value;
  XSCALE = WIDTH / DOMAIN;
  NUMBER_GRID_LINES = DOMAIN;
  main();
});

TEXTFIELD_yws.value = RANGE;
TEXTFIELD_yws.input.addEventListener('change', () => {
  TEXTFIELD_yws.value = Math.max(TEXTFIELD_yws.value, 1);
  RANGE = TEXTFIELD_yws.value;
  YSCALE = HEIGHT / RANGE;
  main();
});

TEXTFIELD_nw.value = N_WORKERS;
TEXTFIELD_nw.input.addEventListener('change', () => {
  TEXTFIELD_nw.value = Math.max(Math.min(TEXTFIELD_nw.value, navigator.hardwareConcurrency), 1);
  N_WORKERS = TEXTFIELD_nw.value;
  main();
});

TEXTFIELD_np.value = TOTAL;
TEXTFIELD_np.input.addEventListener('change', () => {
  TEXTFIELD_np.value = Math.max(TEXTFIELD_np.value, 0);
  TOTAL = TEXTFIELD_np.value;
  main();
});

BUTTON_restart.root.addEventListener('click', () => {
  main();
});


BUTTON_download.root.addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = f;
  a.href = c.toDataURL("image/png;base64");
  a.click();
});

function P(x, y) {
  return [Math.floor(x * XSCALE), Math.floor(y * YSCALE)];
}

function updatef() {
  let n = `f(x,y) = ${TEXTFIELD_Fxy.value}`;
  if (f != n) {
    f = n;
    main();
  }
}

function drawGrid() {
  // grid lines
  ctx.beginPath();
  ctx.strokeStyle = "#eee";
  for (var i = -DOMAIN / 2; i < DOMAIN / 2 + 1; i += DOMAIN / NUMBER_GRID_LINES) {
    // horizontal grid line
    ctx.moveTo(...P(-DOMAIN / 2, i));
    ctx.lineTo(...P(DOMAIN / 2, i));
    ctx.stroke();
    // vertical grid line
    ctx.moveTo(...P(i, -RANGE / 2));
    ctx.lineTo(...P(i, RANGE / 2));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.strokeStyle = "#000";
  // x axis
  ctx.moveTo(...P(-DOMAIN / 2, 0));
  ctx.lineTo(...P(DOMAIN / 2, 0));
  ctx.stroke();
  // y axis
  ctx.moveTo(...P(0, -RANGE / 2));
  ctx.lineTo(...P(0, RANGE / 2));
  ctx.stroke();
}

function draw(worker, result) {
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  for (const [x, y] of result) {
    ctx.beginPath();
    ctx.arc(...P(x, y), R, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fill();
  }
  points += result.length;
  LINEAR_PROGRESS.progress = points / TOTAL;
  if (points < TOTAL) {
    worker.postMessage(JSON.stringify(request));
  } else {
    worker.terminate();
  }
}

function call_workers() {
  while (WORKERS.length > 0) {
    WORKERS.pop();
  }
  for (let i = 0; i < Math.min(N_WORKERS, TOTAL); ++i) {
    let worker = new Worker('./worker.js');
    worker.addEventListener('message', (event) => {
      const response = JSON.parse(event.data);
      if (response.err) {
        TEXTFIELD_Fxy.root.classList.add('mdc-text-field--invalid');
        TEXTFIELD_Fxy_hint.style.display = 'flex';
        return;
      } else {
        TEXTFIELD_Fxy.root.classList.remove('mdc-text-field--invalid');
        TEXTFIELD_Fxy_hint.style.display = 'none';
      }
      draw(worker, response.result);
    });
    WORKERS.push(worker);
  }
  for (let worker of WORKERS) {
    worker.postMessage(JSON.stringify(request));
  }
}

async function main() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);
  points = 0;
  LINEAR_PROGRESS.progress = points / TOTAL;
  drawGrid();
  request = {
    domain: DOMAIN,
    range: RANGE,
    p: Math.min(TOTAL, 10000) / N_WORKERS,
    f: f
  };
  call_workers();
}

updatef();
main();

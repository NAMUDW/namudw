// scrip.js

// ★★★ 전역 상수
const API_BASE_URL = apiGlobalURL + '/api/articles';
const SMART_STORE_URL = 'https://smartstore.naver.com/namu_dw';
const INSTA_URL = 'https://www.instagram.com/namu_dw/';

window.SHADOW_OPACITY = 0.6;
document.documentElement.style.setProperty('--shadow-opacity', window.SHADOW_OPACITY);

window.PLANT_GESTURE_ENABLED = false;
if (typeof window.CAPTURE_PREVIEW_SCALE !== 'number') {
  window.CAPTURE_PREVIEW_SCALE = 0.6;
}

const screenList = document.getElementById('screenList');
const screenCamera = document.getElementById('screenCamera');
const stepIndicator = document.getElementById('stepIndicator');
const plantGrid = document.getElementById('plantGrid');
const sizeTabs = document.getElementById('sizeTabs');

const modeDialog = document.getElementById('modeDialog');
const modeLiveBtn = document.getElementById('modeLiveBtn');
const modeImageBtn = document.getElementById('modeImageBtn');
const modeCancelBtn = document.getElementById('modeCancelBtn');
const bgFileInput = document.getElementById('bgFileInput');

const cameraVideo = document.getElementById('camera');
const bgImage = document.getElementById('bgImage');
const headerLogo = document.getElementById('headerLogo');

const plantShadow = document.getElementById('plantShadow');
const plantMain = document.getElementById('plantMain');
const plantNameLabel = document.getElementById('plantNameLabel');
const captureBtn = document.getElementById('captureBtn');
const shareBtn = document.getElementById('shareBtn');
const purchaseBtn = document.getElementById('purchaseBtn');
const toastEl = document.getElementById('toast');
const cameraStage = document.querySelector('.camera-stage');
const rotateBtn = document.getElementById('rotateBtn');
const smallerBtn = document.getElementById('smallerBtn');
const biggerBtn = document.getElementById('biggerBtn');
const resetBtn = document.getElementById('resetBtn');
const changePlantBtn = document.getElementById('changePlantBtn');
const depthTrack = document.getElementById('depthTrack');
const depthThumb = document.getElementById('depthThumb');
const captureCanvas = document.getElementById('captureCanvas');
const captureResult = document.getElementById('captureResult');
const capturedImage = document.getElementById('capturedImage');
const captureCloseBtn = document.getElementById('captureCloseBtn');

const instaBtn = document.getElementById('instaBtn');
const smartStoreBtn = document.getElementById('smartStoreBtn');

instaBtn.href = INSTA_URL;
smartStoreBtn.href = SMART_STORE_URL;

let isCameraMode = true;
let cameraStream = null;
let selectedPlant = null;
let toastTimeout = null;
let currentSizeFilter = 'ALL';

// ★★★ 로딩 상태
let isPlantLoading = false;

// ★★★ DB에서 가져온 식물 리스트
let plants = [];

// ★★★ 로딩 스켈레톤 표시 함수
function setPlantLoading(flag) {
  isPlantLoading = flag;
  plantGrid.innerHTML = '';
  if (flag) {
    plantGrid.classList.add('loading');
    // 스켈레톤 카드 6개 정도
    const count = 6;
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'plant-card';
      card.innerHTML = `
            <div class="skeleton-thumb"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line small"></div>
          `;
      plantGrid.appendChild(card);
    }
  } else {
    plantGrid.classList.remove('loading');
  }
}

// ★★★ Plant API 호출
async function fetchPlantList() {
  setPlantLoading(true);
  try {
    const res = await fetch(`${API_BASE_URL}/plants/`, {
      method: 'GET'
    });
    if (!res.ok) {
      throw new Error('API error: ' + res.status);
    }
    const data = await res.json();
    const results = data.results || [];

    plants = results.map(p => {
      let sizeCategory = p.status_label;
      if (!sizeCategory && p.status) {
        if (p.status === 'B') sizeCategory = '대형';
        else if (p.status === 'M') sizeCategory = '중형';
        else if (p.status === 'S') sizeCategory = '소형';
      }

      let sizeCm = '';
      if (p.size) {
        const raw = String(p.size).trim();
        sizeCm = raw.toLowerCase().endsWith('cm') ? raw : `${raw}cm`;
      }

      let thumbSrc = '';
      if (p.image_base64) {
        thumbSrc = p.image_base64.startsWith('data:')
          ? p.image_base64
          : 'data:image/png;base64,' + p.image_base64;
      } else {
        thumbSrc = 'plant/placeholder.png';
      }

      return {
        id: p.id,
        name: p.name || '이름 없는 식물',
        link: p.link || null,
        sizeCategory: sizeCategory || '중형',
        sizeCm: sizeCm,
        price: p.price ?? null,
        isSoldOut: !!p.is_sold_out,
        thumbSrc: thumbSrc
      };
    });
  } catch (err) {
    console.error('식물 리스트를 가져오는 중 오류:', err);
    showToast('식물 목록을 불러오지 못했습니다.');
  } finally {
    setPlantLoading(false);
    renderPlantList();
  }
}

function renderPlantList() {
  plantGrid.innerHTML = '';

  const filtered = plants.filter(p => {
    if (currentSizeFilter === 'ALL') return true;
    return p.sizeCategory === currentSizeFilter;
  });

  if (!filtered.length) {
    plantGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align:center; font-size:12px; color:#9ca3af; padding:16px 0;">
            표시할 식물이 없습니다.
          </div>`;
    return;
  }

  filtered.forEach((plant) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'plant-card';
    card.dataset.plantId = plant.id;
    card.dataset.plantName = plant.name;
    card.dataset.plantLink = plant.link || '';
    card.dataset.plantSizeCategory = plant.sizeCategory;
    card.dataset.plantSizeCm = plant.sizeCm;
    card.dataset.plantPrice = plant.price != null ? String(plant.price) : '';

    const priceText = plant.price != null ? plant.price.toLocaleString() + '원' : '';

    card.innerHTML = `
  ${priceText ? `<div class="plant-price-chip">${priceText}</div>` : ''}
  <img src="${plant.thumbSrc}" alt="${plant.name}" class="plant-thumb" loading="lazy">
  <div class="plant-label">
    <div class="plant-label-name">${plant.name}</div>
    <div class="plant-label-meta">
      <span>${plant.sizeCategory}</span>
      ${plant.sizeCm ? `<span class="meta-dot">·</span><span>${plant.sizeCm}</span>` : ''}
    </div>
  </div>
`;

    card.addEventListener('click', () => onSelectPlant(plant));
    plantGrid.appendChild(card);
  });
}

sizeTabs.querySelectorAll('.size-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    sizeTabs.querySelectorAll('.size-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentSizeFilter = tab.dataset.size || 'ALL';
    renderPlantList();
  });
});

function setStep(step) {
  if (step === 1) {
    stepIndicator.innerHTML = `<span class="step-dot"></span><span>1 / 3 · 식물 선택</span>`;
  } else if (step === 2) {
    stepIndicator.innerHTML = `<span class="step-dot"></span><span>2 / 3 · 공간에 배치해 보기</span>`;
  } else if (step === 3) {
    stepIndicator.innerHTML = `<span class="step-dot"></span><span>3 / 3 · 결과 확인 및 공유</span>`;
  }
}

function onSelectPlant(plant) {
  selectedPlant = plant;
  plantShadow.src = plant.thumbSrc;
  plantMain.src = plant.thumbSrc;

  // ★★★ 카메라 상단: 이름 + 높이 같이 표시
  if (plant.sizeCm) {
    plantNameLabel.textContent = `${plant.name} · ${plant.sizeCategory} · ${plant.sizeCm}`;
  } else {
    plantNameLabel.textContent = `${plant.name} · ${plant.sizeCategory}`;
  }

  modeDialog.classList.add('active');
}

modeCancelBtn.addEventListener('click', () => {
  modeDialog.classList.remove('active');
  selectedPlant = null;
});

modeLiveBtn.addEventListener('click', () => {
  modeDialog.classList.remove('active');
  isCameraMode = true;
  cameraVideo.style.display = 'block';
  bgImage.style.display = 'none';
  resetPlantTransformAndSlider();
  showCameraScreen();
  startCamera();
});

modeImageBtn.addEventListener('click', () => {
  bgFileInput.click();
});

bgFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    bgImage.src = ev.target.result;
    isCameraMode = false;
    modeDialog.classList.remove('active');
    cameraVideo.style.display = 'none';
    bgImage.style.display = 'block';
    stopCamera();
    resetPlantTransformAndSlider();
    showCameraScreen();
  };
  reader.readAsDataURL(file);
  bgFileInput.value = '';
});

function showListScreen() {
  screenCamera.classList.remove('active');
  screenList.classList.add('active');
  stopCamera();
  setStep(1);
}

function showCameraScreen() {
  screenList.classList.remove('active');
  screenCamera.classList.add('active');
  setStep(2);
}

changePlantBtn.addEventListener('click', showListScreen);

async function startCamera() {
  if (cameraStream) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    cameraStream = stream;
    cameraVideo.srcObject = stream;
  } catch (err) {
    console.error('카메라 권한 에러:', err);
    showToast('카메라를 사용할 수 없습니다.');
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    cameraVideo.srcObject = null;
  }
}

const plantWrapper = document.getElementById('plantWrapper');
let gestureScale = 1;
let sliderRatio = 0.5;
let sliderScale = 1;
let currentX = 0, currentY = 0, currentRotation = 0;

let dragStartX = 0, dragStartY = 0, dragBaseX = 0, dragBaseY = 0;
let pinchStartDist = 0, pinchStartAngle = 0, pinchBaseScale = 1, pinchBaseRot = 0;
let lastTouchCount = 0;

function recomputeSliderScale() {
  const offset = (sliderRatio - 0.5) * 2;
  const factor = 1 + offset * 0.6;
  sliderScale = Math.max(0.4, Math.min(1.6, factor));
}

function applyTransform() {
  const effectiveScale = gestureScale * sliderScale;
  plantWrapper.style.transform =
    `translate3d(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px), 0) ` +
    `scale(${effectiveScale}) rotate(${currentRotation}deg)`;
}

function resetPlantTransformAndSlider() {
  currentX = 0; currentY = 0; currentRotation = 0;
  gestureScale = 1; sliderRatio = 0.5;
  recomputeSliderScale();
  applyTransform();
  updateSliderThumbPosition();
}

function getDistance(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
function getAngle(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.atan2(dy, dx) * 180 / Math.PI;
}

cameraStage.addEventListener('touchstart', (e) => {
  if (e.target.closest('.camera-controls')) return;
  e.preventDefault();
  const tc = e.touches.length;
  lastTouchCount = tc;
  if (tc === 1) {
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
    dragBaseX = currentX;
    dragBaseY = currentY;
  } else if (tc === 2 && window.PLANT_GESTURE_ENABLED) {
    pinchStartDist = getDistance(e.touches[0], e.touches[1]);
    pinchStartAngle = getAngle(e.touches[0], e.touches[1]);
    pinchBaseScale = gestureScale;
    pinchBaseRot = currentRotation;
  }
}, { passive: false });

cameraStage.addEventListener('touchmove', (e) => {
  if (e.target.closest('.camera-controls')) return;
  e.preventDefault();
  const tc = e.touches.length;
  if (tc !== lastTouchCount) {
    lastTouchCount = tc;
    if (tc === 1) {
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragBaseX = currentX;
      dragBaseY = currentY;
    } else if (tc === 2 && window.PLANT_GESTURE_ENABLED) {
      pinchStartDist = getDistance(e.touches[0], e.touches[1]);
      pinchStartAngle = getAngle(e.touches[0], e.touches[1]);
      pinchBaseScale = gestureScale;
      pinchBaseRot = currentRotation;
    }
    return;
  }

  if (tc === 1) {
    currentX = dragBaseX + (e.touches[0].clientX - dragStartX);
    currentY = dragBaseY + (e.touches[0].clientY - dragStartY);
    applyTransform();
  } else if (tc === 2 && window.PLANT_GESTURE_ENABLED) {
    const dist = getDistance(e.touches[0], e.touches[1]);
    const angle = getAngle(e.touches[0], e.touches[1]);
    gestureScale = Math.max(0.2, Math.min(4, pinchBaseScale * (dist / pinchStartDist)));
    currentRotation = pinchBaseRot + (angle - pinchStartAngle);
    applyTransform();
  }
}, { passive: false });

cameraStage.addEventListener('touchend', (e) => {
  if (e.target.closest('.camera-controls')) return;
  lastTouchCount = e.touches.length;
});

let isMouseDown = false;
let mouseStartX = 0;
let mouseStartY = 0;
let mouseBaseX = 0;
let mouseBaseY = 0;

cameraStage.addEventListener('mousedown', (e) => {
  if (e.target.closest('.camera-controls')) return;
  e.preventDefault();
  isMouseDown = true;
  mouseStartX = e.clientX;
  mouseStartY = e.clientY;
  mouseBaseX = currentX;
  mouseBaseY = currentY;
});

window.addEventListener('mousemove', (e) => {
  if (!isMouseDown) return;
  e.preventDefault();
  const dx = e.clientX - mouseStartX;
  const dy = e.clientY - mouseStartY;
  currentX = mouseBaseX + dx;
  currentY = mouseBaseY + dy;
  applyTransform();
});

window.addEventListener('mouseup', () => {
  isMouseDown = false;
});

function setupHoldButton(btn, bigFn, smallFn) {
  let t1, t2, holding = false;
  const clear = () => { clearTimeout(t1); clearInterval(t2); t1 = null; t2 = null; };
  const start = (e) => {
    e.preventDefault(); clear(); holding = false;
    t1 = setTimeout(() => { holding = true; smallFn(); t2 = setInterval(smallFn, 80); }, 220);
  };
  const end = () => {
    const was = holding; clear(); holding = false;
    if (!was) bigFn();
  };
  btn.addEventListener('mousedown', start);
  btn.addEventListener('touchstart', start, { passive: false });
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => btn.addEventListener(ev, end));
}

setupHoldButton(smallerBtn,
  () => { gestureScale = Math.max(0.2, gestureScale - 0.15); applyTransform(); },
  () => { gestureScale = Math.max(0.2, gestureScale - 0.02); applyTransform(); }
);
setupHoldButton(biggerBtn,
  () => { gestureScale = Math.min(4, gestureScale + 0.15); applyTransform(); },
  () => { gestureScale = Math.min(4, gestureScale + 0.02); applyTransform(); }
);

rotateBtn.addEventListener('click', () => { currentRotation += 90; applyTransform(); });
resetBtn.addEventListener('click', resetPlantTransformAndSlider);

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('active');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.remove('active'), 1500);
}

// ===== 캡처 기능 =====
captureBtn.addEventListener('click', () => {
  const stageRect = cameraStage.getBoundingClientRect();
  const plantInner = document.querySelector('.plant-wrapper-inner');
  if (!plantInner) return;

  captureCanvas.width = stageRect.width;
  captureCanvas.height = stageRect.height;
  const ctx = captureCanvas.getContext('2d');

  if (isCameraMode) {
    if (cameraVideo && cameraVideo.videoWidth > 0) {
      drawObjectFitCover(ctx, cameraVideo, captureCanvas.width, captureCanvas.height);
    }
  } else {
    if (bgImage && bgImage.naturalWidth > 0) {
      drawObjectFitContain(ctx, bgImage, captureCanvas.width, captureCanvas.height);
    }
  }

  const plantRect = plantInner.getBoundingClientRect();
  const scaleX = captureCanvas.width / stageRect.width;
  const scaleY = captureCanvas.height / stageRect.height;

  const centerX = (plantRect.left - stageRect.left + plantRect.width / 2) * scaleX;
  const centerY = (plantRect.top - stageRect.top + plantRect.height / 2) * scaleY;

  const effScale = gestureScale * sliderScale;
  const rad = currentRotation * Math.PI / 180;
  const baseW = plantInner.offsetWidth * scaleX;
  const baseH = plantInner.offsetHeight * scaleY;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rad);
  ctx.scale(effScale, effScale);

  ctx.shadowColor = `rgba(0, 0, 0, ${window.SHADOW_OPACITY})`;
  ctx.shadowBlur = 30 * scaleX;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 16 * scaleY;

  try {
    ctx.drawImage(plantMain, -baseW / 2, -baseH / 2, baseW, baseH);
  } catch (e) { }

  ctx.restore();

  const normRot = ((currentRotation % 360) + 360) % 360;
  let finalCanvas = captureCanvas;
  let finalCtx = ctx;
  const isSide = (Math.abs(normRot - 90) < 0.5 || Math.abs(normRot - 270) < 0.5);

  if (isSide) {
    const rCanvas = document.createElement('canvas');
    rCanvas.width = captureCanvas.height;
    rCanvas.height = captureCanvas.width;
    const rCtx = rCanvas.getContext('2d');
    rCtx.save();
    if (Math.abs(normRot - 90) < 0.5) {
      rCtx.translate(0, rCanvas.height); rCtx.rotate(-Math.PI / 2);
    } else {
      rCtx.translate(rCanvas.width, 0); rCtx.rotate(Math.PI / 2);
    }
    rCtx.drawImage(captureCanvas, 0, 0);
    rCtx.restore();
    finalCanvas = rCanvas;
    finalCtx = rCtx;
  }

  if (headerLogo && headerLogo.complete && headerLogo.naturalWidth > 0) {
    const logoW = Math.min(100, finalCanvas.width * 0.25);
    const logoH = logoW * (headerLogo.naturalHeight / headerLogo.naturalWidth);
    const margin = 20;

    finalCtx.shadowColor = 'transparent';
    finalCtx.shadowBlur = 0;
    finalCtx.shadowOffsetX = 0;
    finalCtx.shadowOffsetY = 0;

    finalCtx.drawImage(headerLogo, margin, margin, logoW, logoH);
  }

  try {
    capturedImage.src = finalCanvas.toDataURL('image/png');
    if (!isSide) {
      capturedImage.style.width = '100%';
      capturedImage.style.height = '100%';
      capturedImage.style.objectFit = 'contain';
    } else {
      capturedImage.style.width = '100%';
      capturedImage.style.height = 'auto';
      capturedImage.style.objectFit = 'contain';
    }

    // ★★★ 식물 구입 버튼 링크 설정 (없으면 스마트스토어)
    const plantLink = selectedPlant && selectedPlant.link ? selectedPlant.link : SMART_STORE_URL;
    purchaseBtn.href = plantLink || SMART_STORE_URL;
    purchaseBtn.target = '_blank';
    purchaseBtn.rel = 'noopener';

    captureResult.classList.add('active');
    setStep(3);
  } catch (e) {
    console.error(e);
    showToast('이미지 생성 실패');
  }
});

shareBtn.addEventListener('click', async () => {
  if (!capturedImage.src) return;
  try {
    const blob = await (await fetch(capturedImage.src)).blob();
    const file = new File([blob], "namudown_capture.png", { type: blob.type });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: '나무다운',
        text: '우리 집에 어울리는 식물을 배치해보세요!',
      });
    } else {
      showToast('이 브라우저에서는 공유 기능을 지원하지 않습니다.');
    }
  } catch (error) {
    console.error('공유 실패:', error);
    showToast('공유하기 실패');
  }
});

captureCloseBtn.addEventListener('click', () => {
  captureResult.classList.remove('active');
  setStep(2);
});

function drawObjectFitCover(ctx, source, cw, ch) {
  const sw = source.videoWidth || source.naturalWidth;
  const sh = source.videoHeight || source.naturalHeight;
  if (!sw || !sh) return;
  const sRatio = sw / sh;
  const cRatio = cw / ch;
  let sx, sy, sWidth, sHeight;
  if (sRatio > cRatio) {
    sHeight = sh; sWidth = sh * cRatio;
    sx = (sw - sWidth) / 2; sy = 0;
  } else {
    sWidth = sw; sHeight = sw / cRatio;
    sx = 0; sy = (sh - sHeight) / 2;
  }
  ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, cw, ch);
}

function drawObjectFitContain(ctx, source, cw, ch) {
  const sw = source.naturalWidth;
  const sh = source.naturalHeight;
  if (!sw || !sh) return;
  const sRatio = sw / sh;
  const cRatio = cw / ch;
  let drawW, drawH, sx, sy;
  if (sRatio > cRatio) {
    drawW = cw; drawH = cw / sRatio; sx = 0; sy = (ch - drawH) / 2;
  } else {
    drawH = ch; drawW = ch * sRatio; sx = (cw - drawW) / 2; sy = 0;
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(source, 0, 0, sw, sh, sx, sy, drawW, drawH);
}

let sDragging = false;
let sRect = null;
function setSlider(r) {
  sliderRatio = Math.max(0, Math.min(1, r));
  recomputeSliderScale(); updateSliderThumbPosition(); applyTransform();
}
function updateSliderThumbPosition() {
  if (!depthTrack || !depthThumb) return;
  const tr = depthTrack.getBoundingClientRect();
  const th = depthThumb.getBoundingClientRect();
  const l = 8 + (tr.width - th.width - 16) * sliderRatio;
  depthThumb.style.left = l + 'px';
}
function dragS(cx) {
  sDragging = true;
  sRect = depthTrack.getBoundingClientRect();
  setSlider((cx - sRect.left) / sRect.width);
}

[depthTrack, depthThumb].forEach(el => {
  el.addEventListener('mousedown', e => { e.preventDefault(); dragS(e.clientX); });
  el.addEventListener('touchstart', e => { e.preventDefault(); dragS(e.touches[0].clientX); }, { passive: false });
});
window.addEventListener('mousemove', e => { if (sDragging) { e.preventDefault(); dragS(e.clientX); } });
window.addEventListener('touchmove', e => { if (sDragging) { e.preventDefault(); dragS(e.touches[0].clientX); } }, { passive: false });
window.addEventListener('mouseup', () => sDragging = false);
window.addEventListener('touchend', () => sDragging = false);
window.addEventListener('resize', updateSliderThumbPosition);

// 초기화
fetchPlantList();             // ★★★ DB에서 식물 리스트 가져오기 (로딩 애니메이션 포함)
resetPlantTransformAndSlider();
setStep(1);
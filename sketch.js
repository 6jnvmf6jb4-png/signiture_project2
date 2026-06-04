// [0] 전역 변수 및 이미지 로드
let bgImg; 
let chestImg; 
let successImg; 
let failImg;    
let currentMode = 'draw'; 
let currentGalleryBg = null; 

// 💡 버튼들을 전역 변수로 선언
let btn, clearDrawBtn, galleryBtn, backBtn; 

function preload() {
  bgImg = loadImage('서명패드.png'); 
  chestImg = loadImage('chest.png'); 
  successImg = loadImage('저장성공.png'); 
  failImg = loadImage('저장실패.png');   
}

// [1] 파이어베이스 연결
let db;
try {
  const firebaseConfig = {
    apiKey: "AIzaSyCVUgHcYFsWfPi-Xm_T1FdvgTAUmzTdsYc",
    authDomain: "signiture-1bf46.firebaseapp.com",
    projectId: "signiture-1bf46",
    storageBucket: "signiture-1bf46.firebasestorage.app",
    messagingSenderId: "692434929950",
    appId: "1:692434929950:web:695650db09b0b7effe610f",
    measurementId: "G-3LCCD3R1Z0"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  console.log("시스템: 파이어베이스 연결 성공");
} catch (e) {
  console.log("시스템: 파이어베이스 연결 실패. 원인:", e);
}

// [2] 캔버스 및 그리기 변수들
let totalDistance = 0;      
let activeFrames = 0;       
let currentStroke = [];     
let allStrokes = [];

function setup() {
  document.body.style.backgroundColor = '#1a1a1a'; 
  document.body.style.margin = '0';                
  document.body.style.overflow = 'hidden';         

  // 원래의 멋진 3D 검은색 버튼 스타일 유지
  let btnStyles = `
    .pos-btn {
      background: linear-gradient(to bottom, #6a6a6a 0%, #2b2b2b 12%, #050505 40%, #000000 100%);
      border: 1px solid #000;
      border-radius: 12px;
      color: #ffffff;
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      font-weight: 900;
      font-size: 15px;
      letter-spacing: 1px;
      padding: 12px 20px;
      box-shadow: 
        inset 0px 3px 2px rgba(255, 255, 255, 0.4), 
        0px 5px 0px #0a0a0a, 
        0px 7px 5px rgba(0, 0, 0, 0.7); 
      cursor: pointer;
      outline: none;
      user-select: none;
      transition: transform 0.05s, box-shadow 0.05s;
    }
    .pos-btn:active {
      transform: translateY(4px); 
      box-shadow: 
        inset 0px 1px 1px rgba(255, 255, 255, 0.3), 
        0px 1px 0px #0a0a0a, 
        0px 2px 2px rgba(0, 0, 0, 0.8);
    }
  `;
  
  // 스타일 적용
  let styleEl = createElement('style', btnStyles);
  styleEl.parent(document.head);

  let imgRatio = bgImg.width / bgImg.height;
  let padW = windowWidth;
  let padH = windowWidth / imgRatio;

  if (padH > windowHeight) {
    padH = windowHeight;
    padW = windowHeight * imgRatio;
  }

  let canvas = createCanvas(padW, padH); 
  canvas.position((windowWidth - padW) / 2, (windowHeight - padH) / 2); 
  
  canvas.style('position', 'absolute');
  canvas.style('display', 'block');
  canvas.style('z-index', '1');
  
  background(224, 224, 224); 
  image(bgImg, 0, 0, width, height);
  
  // 버튼 생성 및 기본 설정
  btn = createButton('확인');
  btn.style('z-index', '10'); 
  btn.addClass('pos-btn'); 
  btn.mousePressed(evaluateSignature);
  
  clearDrawBtn = createButton('취소');
  clearDrawBtn.style('z-index', '10'); 
  clearDrawBtn.addClass('pos-btn'); 
  clearDrawBtn.mousePressed(resetCanvas); 
  
  galleryBtn = createButton('저장소');
  galleryBtn.style('z-index', '10'); 
  galleryBtn.addClass('pos-btn'); 
  galleryBtn.mousePressed(() => {
    currentMode = 'gallery';
    currentGalleryBg = chestImg;
    image(currentGalleryBg, 0, 0, width, height); 
    fetchAndDrawSignatures();
    updateButtonPositions(); // 저장소 모드로 위치 및 숨김 새로고침
  });

  backBtn = createButton('홈');
  backBtn.style('z-index', '10'); 
  backBtn.addClass('pos-btn'); 
  backBtn.mousePressed(() => {
    currentMode = 'draw';
    resetCanvas(); 
    updateButtonPositions(); // 그리기 모드로 위치 및 보임 새로고침
  });

  // 버튼 위치 초기화 실행
  updateButtonPositions();
}

// 💡 [핵심 변동] 홈화면/저장소 화면에 맞춰 버튼의 위치와 노출 여부를 동적으로 제어합니다.
function updateButtonPositions() {
  let canvasX = (windowWidth - width) / 2;
  let canvasY = (windowHeight - height) / 2;

  if (currentMode === 'draw') {
    // 1️⃣ [그리기 모드] 모든 버튼 표시
    if (galleryBtn) { galleryBtn.show(); galleryBtn.position(canvasX + (width * 0.21), canvasY + (height * 0.84)); }
    if (backBtn)    { backBtn.show();    backBtn.position(canvasX + (width * 0.31), canvasY + (height * 0.84)); }
    if (btn)        { btn.show();        btn.position(canvasX + (width * 0.63), canvasY + (height * 0.84)); }
    if (clearDrawBtn) { clearDrawBtn.show(); clearDrawBtn.position(canvasX + (width * 0.73), canvasY + (height * 0.84)); }

  } else if (currentMode === 'gallery') {
    // 2️⃣ [저장소 모드] [확인], [취소] 버튼은 숨김
    if (btn) btn.hide();
    if (clearDrawBtn) clearDrawBtn.hide();

    // 3️⃣ [홈] 버튼과 [저장소] 버튼은 유지 (랜덤 재배치 기능을 위해!)
    if (backBtn) {
      backBtn.show();
      backBtn.position(canvasX + 20, canvasY + 20); // 왼쪽 위 구석
    }
    
    if (galleryBtn) {
      galleryBtn.show(); // 💡 버튼이 다시 나타나게 했습니다!
      galleryBtn.position(canvasX + 120, canvasY + 20); // [홈] 버튼 바로 옆에 배치
    }
  }
}

function draw() {
  if (currentMode === 'draw') {
    if (mouseIsPressed) {
      stroke(0);
      strokeWeight(2);
      line(pmouseX, pmouseY, mouseX, mouseY);

      currentStroke.push({x: mouseX, y: mouseY});
      totalDistance += dist(pmouseX, pmouseY, mouseX, mouseY);
      activeFrames++;
    }
  } 
}

function mouseReleased() {
  if (currentStroke.length > 0) {
    allStrokes.push(currentStroke);
    currentStroke = []; 
  }
}

function evaluateSignature() {
  if (activeFrames === 0 && allStrokes.length === 0) {
    alert("내용을 입력해주세요.");
    return;
  }

  let finalStrokes = [...allStrokes];
  if (currentStroke.length > 0) {
    finalStrokes.push(currentStroke);
  }

  let avgSpeed = totalDistance / activeFrames; 
  let strokeCount = finalStrokes.length;       

  let speedCutoff = 4.0;    
  let strokeCutoff = 4;     

  let isFast = avgSpeed >= speedCutoff;   
  let isFewLifts = strokeCount <= strokeCutoff; 
  let isEnoughDraw = totalDistance > 50;  

  if (isEnoughDraw && isFast && isFewLifts) {
    background(245, 245, 245); 
    image(successImg, 0, 0, width, height); 
    
    if (db) {
      try {
        db.collection("signatures").add({
          path: JSON.stringify(finalStrokes), 
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          console.log("시스템 저장 완료");
        }).catch((error) => {
          console.log("파이어베이스 전송 실패:", error);
        });
      } catch (e) {
        console.log("파이어베이스 연결 오류:", e);
      }
    }
    setTimeout(resetCanvas, 2000); 
  } 
  else {
    background(245, 245, 245); 
    image(failImg, 0, 0, width, height); 
    console.log(`❌ 실패 원인 분석 -> 현재속도: ${avgSpeed.toFixed(1)} (기준:${speedCutoff}이상), 획수: ${strokeCount}개 (기준:${strokeCutoff}개이하)`);
    setTimeout(resetCanvas, 2000); 
  }
}

function resetCanvas() {
  background(224, 224, 224);
  image(bgImg, 0, 0, width, height); 
  
  currentStroke = [];
  allStrokes = []; 
  totalDistance = 0;
  activeFrames = 0;
}

function smoothPoints(pts, iterations = 2) {
  if (pts.length < 3) return pts;
  let current = pts;
  for (let iter = 0; iter < iterations; iter++) {
    let next = [];
    next.push(current[0]); 
    for (let i = 0; i < current.length - 1; i++) {
      let p0 = current[i];
      let p1 = current[i + 1];
      next.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
      next.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
    }
    next.push(current[current.length - 1]); 
    current = next;
  }
  return current;
}

function fetchAndDrawSignatures() {
  db.collection("signatures").get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      let strokes = JSON.parse(doc.data().path);
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;

      for (let s of strokes) {
        for (let p of s) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
      }

      let drawW = maxX - minX;
      let drawH = maxY - minY;
      let targetX = random(50, width - drawW - 50);
      let targetY = random(50, height - drawH - 50);

      function drawTaperedPolygon(pts, maxThickness, offsetX = 0, offsetY = 0) {
        if (pts.length < 2) return;
        let leftPts = [], rightPts = [];
        for (let i = 0; i < pts.length; i++) {
          let p = pts[i];
          let dx = 0, dy = 0;
          if (i === 0) { dx = pts[1].x - pts[0].x; dy = pts[1].y - pts[0].y; } 
          else if (i === pts.length - 1) { dx = pts[i].x - pts[i-1].x; dy = pts[i].y - pts[i-1].y; } 
          else { dx = pts[i+1].x - pts[i-1].x; dy = pts[i+1].y - pts[i-1].y; }
          let len = dist(0, 0, dx, dy);
          if (len === 0) len = 1;
          let nx = -dy / len; let ny = dx / len;
          let t = i / (pts.length - 1);
          let thicknessFactor = sin(t * Math.PI);
          let radius = (maxThickness * thicknessFactor) / 2;
          leftPts.push({ x: p.x + nx * radius + offsetX, y: p.y + ny * radius + offsetY });
          rightPts.push({ x: p.x - nx * radius + offsetX, y: p.y - ny * radius + offsetY });
        }
        beginShape();
        for (let i = 0; i < leftPts.length; i++) vertex(leftPts[i].x, leftPts[i].y);
        for (let i = rightPts.length - 1; i >= 0; i--) vertex(rightPts[i].x, rightPts[i].y);
        endShape(CLOSE);
      }

      noStroke();
      for (let s of strokes) {
        let pts = [];
        for (let p of s) { pts.push({ x: p.x - minX + targetX, y: p.y - minY + targetY }); }
        if (pts.length < 2) continue;

        pts = smoothPoints(pts, 2); 

        blendMode(MULTIPLY); 
        drawingContext.shadowBlur = 15; 
        drawingContext.shadowColor = 'rgba(180, 0, 0, 0.4)'; 
        fill(180, 40, 40, 40); 
        drawTaperedPolygon(pts, 12); 
        drawingContext.shadowBlur = 0; 

        fill(110, 15, 15, 200); 
        drawTaperedPolygon(pts, 4.5); 
        blendMode(BLEND); 
        fill(255, 220, 220, 90); 
        drawTaperedPolygon(pts, 1.5, 1.5, 1.5); 
      }
      blendMode(BLEND); 
    });
  });
}

function windowResized() {
  let imgRatio = bgImg.width / bgImg.height;
  let padW = windowWidth;
  let padH = windowWidth / imgRatio;
  if (padH > windowHeight) {
    padH = windowHeight;
    padW = windowHeight * imgRatio;
  }
  resizeCanvas(padW, padH);
  
  select('canvas').position((windowWidth - padW) / 2, (windowHeight - padH) / 2);
  
  // 창 크기 조절 시에도 바뀐 모드 규칙 유지하며 재배치
  updateButtonPositions();

  if (currentMode === 'gallery') {
    if (currentGalleryBg) image(currentGalleryBg, 0, 0, width, height); 
    fetchAndDrawSignatures();
  } else {
    background(224, 224, 224);
    image(bgImg, 0, 0, width, height); 
  }
}
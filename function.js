// 以 https://www.youtube.com/watch?v=eoXn6nwV694 與 https://github.com/carltheperson/3d-to-2d-example/blob/main/index.ts 為基礎


const xmls = 'http://www.w3.org/2000/svg';

const svgEarth = document.getElementById('svgEarth');
const svgMap = document.getElementById('svgMap');
const gSea = document.getElementById('gSea');
const gLand = document.getElementById('gLand');
const gBoundary = document.getElementById('gBoundary');
const gMainLatitude = document.getElementById('gMainLatitude');
const gMapLatitude = document.getElementById('gMapLatitude');
const lineHor = document.getElementById('lineHor');
const lineVer = document.getElementById('lineVer');

const setting = {
    device: {
        isPortrait: false,
        isClickable: false,
        isTouchable: false
    },
    lock: false,
    draw: {
        border: true,
        boundary: true,
        latitude: true
    },
    svg: {
        width: 0,
        height: 0,
        halfWidth: 0,
        halfHeight: 0,
        baseR: 0,
        scale: 1,
        scaledWidth: 0,
        scaledHeight: 0,
        scaledHalfWidth: 0,
        scaledHalfHeight: 0
    },
    mouse: {
        x: 0,
        y: 0,
        dragSpeed: 3,
        spinSpeed: 10
    },
    last: {
        x: 0,
        y: 0
    },
    angle: {
        fov: 45,
        fovTangent: 0,
        roll: 0,
        pitch: 0,
        yaw: 0,
        matrix: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ]
    },
    distance: {
        value: 5,
        x: 0,
        offset: 0.2,
        min: 1.3,
        max: 6.6,
        dragRatio: 0.8,
        dragRadius: 0,
        borderDistance: 0
    },
    sea: {
        //color: '#81c7d4',
        //color: '#a1e7f4',
        color: '#7db9de',
        borderColor: '#808080',
        divide: 144,
        z: 0,
        radius: 0,
        displayRadius: 0
    },
    aim: {
        size: 5,
        coor3D:{
            x: 0,
            y: 0,
            z: - 1
        }
    },
    boundary: {
        //color: '#81c7d4',
        color: '#000000',
        opacity: 0.05,
        stroke: '#000000'
    }
};

BodyInit();

/**
 * 
 * @param {WheelEvent} event 
 */
function MouseWheelEarth(event){
    // 節流閥沒用？
    if (setting.lock){
        return;
    }
    setting.lock = true;
    if (event.wheelDelta > 0){
        Zoom(true);
    }
    else{
        Zoom(false);
    }
    window.setTimeout(function(){
        setting.lock = false;
    }, 500);
}
function BodyInit(){
    setting.device.isClickable = 'onmousedown' in window;
    setting.device.isTouchable = 'ontouchstart' in window;

    if (setting.device.isClickable){
        svgEarth.addEventListener('mousedown', ClickEarth);
        svgEarth.addEventListener("mousemove", MouseMoveEarth);
        svgEarth.addEventListener('mousewheel', MouseWheelEarth);
        svgMap.addEventListener('click', ClickMap);
        svgMap.addEventListener('mousemove', HoverMap);
        setting.mouse.dragSpeed = 4;
        setting.mouse.spinSpeed = 18;
    }

    if (setting.device.isTouchable){
        svgMap.addEventListener('pointerdown', ClickMap);
        svgMap.addEventListener('pointermove', HoverMap);
        //svgEarth.addEventListener('pointerdown', ClickEarth);
        svgEarth.addEventListener('touchstart', TouchEarth);
        //svgEarth.addEventListener('pointermove', DrawEarth);
        svgEarth.addEventListener('touchmove', TouchMoveEarth);
        setting.mouse.dragSpeed = 2;
        setting.mouse.spinSpeed = 8;
    }
    document.getElementById('btnZoomIn').addEventListener('click', function(){ Zoom(true);});
    document.getElementById('btnZoomOut').addEventListener('click', function(){ Zoom(false);});
    document.getElementById('btnBoundary').addEventListener('click', ToggleDrawBoundary);
    document.getElementById('btnBorder').addEventListener('click', ToggleDrawBorder);
    document.getElementById('btnLatitude').addEventListener('click', ToggleDrawLatitude);
    if (screen.orientation){
        setting.device.isPortrait = screen.orientation.type === 'portrait-primary' || screen.orientation.type === 'portrait-secondary';
        screen.orientation.addEventListener('change', ScreenOrientationChange);
    }
    else if (window.orientation){
        setting.device.isPortrait = window.matchMedia('(orientation: portrait)').matches;
        window.addEventListener('orientationchange', WindowOrientationChange);
    }
    else{
        setting.device.isPortrait = window.matchMedia('(orientation: portrait)').matches;
        window.addEventListener('resize', WindowResize);
    }
    InitSetting();
    RefreshSetting();
    InitGeoToCoor();
    DrawSea();
    DrawEarth();
    DrawMap();
}

function ScreenOrientationChange(){
    // 是否為直立移動裝置
    setting.device.isPortrait = screen.orientation.type === 'portrait-primary' || screen.orientation.type === 'portrait-secondary';
    RefreshSetting();
    DrawSea();
    DrawEarth();
    DrawMap();
}

function WindowOrientationChange(){
    // 是否為直立移動裝置
    setting.device.isPortrait = window.matchMedia('(orientation: portrait)').matches;
    RefreshSetting();
    DrawSea();
    DrawEarth();
    DrawMap();
}

function WindowResize(){
    // 取目前的旋轉狀態
    const isPortraitNow = window.matchMedia('(orientation: portrait)').matches;
    // 有旋轉才往下做
    if (setting.device.isPortrait === isPortraitNow){
        return;
    }
    RefreshSetting();
    DrawSea();
    DrawEarth();
    DrawMap();
}

function ClickEarth(event){
    setting.last.x = event.offsetX;
    setting.last.y = event.offsetY;
}

function TouchEarth(event){
    const changedTouches = event.changedTouches[0];
    const rect = svgEarth.getBoundingClientRect();
    setting.last.x = changedTouches.pageX - rect.left;
    setting.last.y = changedTouches.pageY - rect.top;
}

function MouseMoveEarth(event){
    // 有點滑鼠時只有按著左鍵時才會重畫，若滑鼠是懸停的就離開
    if (event && event.buttons !== 1){
        return;
    }
    if (setting.lock){
        return;
    }
    setting.lock = true;
    CalculateAngle(event.offsetX, event.offsetY);
    DrawEarth();
}

function TouchMoveEarth(event){
    if (setting.lock){
        return;
    }
    setting.lock = true;
    const changedTouches = event.changedTouches[0];
    const rect = svgEarth.getBoundingClientRect();
    CalculateAngle(changedTouches.pageX - rect.left, changedTouches.pageY - rect.top);
    DrawEarth();
}

function DrawEarth() {
    const drawData = [];
    for (const data of coorData){
        const parsedData = {};
        parsedData['color'] = data.color;
        parsedData['region'] = [];
        for(const region of data['region']){
            let count = 0;
            const coordinates = [];
            for(const coor3D of region ){
                //const rotated = Rotate2(coor3D, setting.angle.roll, setting.angle.pitch, setting.angle.yaw);
                const rotated = LinearTransform(setting.angle.matrix, coor3D);
                rotated.z = rotated.z + setting.distance.value;

                const distance = GetNorm(rotated);
                if (distance < setting.distance.borderDistance){
                    count++;
                }
                else if (rotated.x === 0 && rotated.y === 0){
                    continue;
                }
                else{
                    // 轉成邊界上的點
                    MoveToBorder(rotated);
                }

                coordinates.push(rotated);
            }
            if (count > 0){
                parsedData['region'].push(coordinates);
            }
        }
        drawData.push(parsedData);
    }
    
    for (const data of drawData){
        for (const region of data['region']){
            for (let i = 0, n = region.length; i < n; i++){
                const coor2D = GetProjection(region[i]);
                Translation(coor2D);
                region[i] = coor2D;
            }
        }
    }
    ClearChildren(gLand);
    DrawEarthPolygon(drawData);
    DrawBoundary();
    DrawMainLatitude();
    setting.lock = false;
}

function CalculateAngle(offsetX, offsetY){
    const dx = offsetX - setting.svg.halfWidth, dy = offsetY - setting.svg.halfHeight;
    const d = Math.sqrt(dx * dx + dy * dy);
    setting.mouse.x = (offsetX - setting.last.x) * setting.mouse.dragSpeed;
    setting.mouse.y = (offsetY - setting.last.y) * setting.mouse.dragSpeed;
    setting.last.x = offsetX;
    setting.last.y = offsetY;
    if (d < setting.distance.dragRadius){
        CalculateDrag();
        setting.aim.coor3D = GetRotateSource();
    }
    else{
        const isClockwise = IsClockwise(dx > 0, dy > 0, setting.mouse.x, setting.mouse.y);
        if (isClockwise === undefined){
            return;
        }
        CalculateSpin(isClockwise);
    }
}

/**
 * 處理地球儀中央的拖拉滾動
 */
function CalculateDrag(){
    const from = { x: 0, y: 0, z: -1 };
    const to = {
        x: setting.mouse.x / setting.svg.width,
        y: setting.mouse.y / setting.svg.height,
        z: -1
    }
    Normalize(to);

    const axis = GetCrossProduct(from, to);
    Normalize(axis);
    const matrixK = GetMatrixK(axis);
    const matrixM = GetMatrixM(- to.z, matrixK);
    setting.angle.matrix = MatrixMulti(matrixM, setting.angle.matrix);
}

/**
 * 判斷是否是順時鐘方向
 * @param {boolean} rightCorner 是否為右上或右下
 * @param {boolean} bottomCorner 是否為右下或左下
 * @param {number} offsetX 橫軸變化量
 * @param {number} offsetY 縱軸變化量
 * @returns {boolean} true 為順時針，false 為逆時針，undefined 則為無法判斷
 */
function IsClockwise(rightCorner, bottomCorner, offsetX, offsetY){
    let clockwise;
    if (rightCorner){
        if (bottomCorner){
            if (offsetX > 0){
                if (offsetY > 0){
                    clockwise = undefined;
                }
                else if (offsetY === 0){
                    //clockwise = false;
                    clockwise = undefined;
                }
                else{
                    clockwise = false;
                }
            }
            else if (offsetX === 0){
                if (offsetY > 0){
                    //clockwise = true;
                    clockwise = undefined;
                }
                else if (offsetY === 0){
                    clockwise = undefined;
                }
                else{
                    //clockwise = false;
                    clockwise = undefined;
                }
            }
            else{
                if (offsetY > 0){
                    clockwise = true;
                }
                else if (offsetY === 0){
                    //clockwise = true;
                    clockwise = undefined;
                }
                else{
                    clockwise = undefined;
                }
            }
        }
        else{
            if (offsetX > 0){
                if (offsetY > 0){
                    clockwise = true;
                }
                else if (offsetY === 0){
                    //clockwise = true;
                    clockwise = undefined;
                }
                else{
                    clockwise = undefined;
                }
            }
            else if (offsetX === 0){
                if (offsetY > 0){
                    //clockwise = true;
                    clockwise = undefined;
                }
                else if (offsetY === 0){
                    clockwise = undefined;
                }
                else{
                    //clockwise = false;
                    clockwise = undefined;
                }
            }
            else{
                if (offsetY > 0){
                    clockwise = undefined;
                }
                else if (offsetY === 0){
                    //clockwise = false;
                    clockwise = undefined;
                }
                else{
                    clockwise = false;
                }
            }
        }
    }
    else{
        if (bottomCorner){
            if (offsetX > 0){
                if (offsetY > 0){
                    clockwise = false;
                }
                else if (offsetY === 0){
                    //clockwise = false;
                    clockwise = undefined;
                }
                else{
                    clockwise = undefined;
                }
            }
            else if (offsetX === 0){
                if (offsetY > 0){
                    //clockwise = false;
                    clockwise = undefined;
                }
                else if (offsetY === 0){
                    clockwise = undefined;
                }
                else{
                    //clockwise = true;
                    clockwise = undefined;
                }
            }
            else{
                if (offsetY > 0){
                    clockwise = undefined;
                }
                else if (offsetY === 0){
                    //clockwise = true;
                    clockwise = undefined;
                }
                else{
                    clockwise = true;
                }
            }
        }
        else{
            if (offsetX > 0){
                if (offsetY > 0){
                    clockwise = undefined;
                }
                else if (offsetY === 0){
                    //clockwise = true;
                    clockwise = undefined;
                }
                else{
                    clockwise = true;
                }
            }
            else if (offsetX === 0){
                if (offsetY > 0){
                    //clockwise = false;
                    clockwise = undefined;
                }
                else if (offsetY === 0){
                    clockwise = undefined;
                }
                else{
                    //clockwise = true;
                    clockwise = undefined;
                }
            }
            else{
                if (offsetY > 0){
                    clockwise = false;
                }
                else if (offsetY === 0){
                    //clockwise = true;
                    clockwise = undefined;
                }
                else{
                    clockwise = undefined;
                }
            }
        }
    }
    return clockwise;
}

/**
 * 處理在地球儀四周的旋轉繞行
 * @param {boolean} isClockwise 是否為順時針旋轉
 */
function CalculateSpin(isClockwise){
    // 旋轉軸即 z 軸，順時針時依右手定則 z 為正
    const axis = { x: 0, y: 0, z: 1 };

    const to = { x: 1, y: setting.mouse.spinSpeed / setting.svg.width, z: 0 };
    Normalize(to);
    // 逆時針時依右手定則 z 為負
    if (!isClockwise){
        axis.z = -1;
    }
    const matrixK = GetMatrixK(axis);
    const matrixM = GetMatrixM(to.x, matrixK);
    setting.angle.matrix = MatrixMulti(matrixM, setting.angle.matrix);
}

function GetMatrixM(cos, K){
    const sin = Math.sqrt(1 - cos * cos);
    //const sin = Math.sin(Math.acos(cos));

    const K2 = MatrixMulti(K, K);
    const A = GetScalarMulti(sin, K);
    const B = GetScalarMulti(1 - cos, K2);
    return [
        [1 + A[0][0] + B[0][0], A[0][1] + B[0][1], A[0][2] + B[0][2]],
        [A[1][0] + B[1][0], 1 + A[1][1] + B[1][1], A[1][2] + B[1][2]],
        [A[2][0] + B[2][0], A[2][1] + B[2][1], 1 + A[2][2] + B[2][2]]
    ];
}

function GetMatrixK(unit){
    return [
        [0, - unit.z, unit.y],
        [unit.z, 0, - unit.x],
        [- unit.y, unit.x, 0]
    ];
}

function GetScalarMulti(scalar, matrix){
    return [
        [scalar * matrix[0][0], scalar * matrix[0][1], scalar * matrix[0][2]],
        [scalar * matrix[1][0], scalar * matrix[1][1], scalar * matrix[1][2]],
        [scalar * matrix[2][0], scalar * matrix[2][1], scalar * matrix[2][2]]
    ];
}

function GetDotProduct(vector1, vector2){
    return vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
}

function Normalize(vector){
    const norm = GetNorm(vector);
    if (norm === 0){
        return;
    }
    vector.x = vector.x / norm;
    vector.y = vector.y / norm;
    vector.z = vector.z / norm;
}

/**
 * 取得與原點 (0, 0, 0) 的距離
 * @param {{x: number, y: number, z: number}} vector 立體空間的向量或三維座標
 * @returns {number} 距離
 */
function GetNorm(vector){
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}

/**
 * 取得兩向量外積結果
 * @param {{x: number, y: number, z: number}} vector1 立體空間的向量1
 * @param {{x: number, y: number, z: number}} vector2 立體空間的向量2
 * @returns {{x: number, y: number, z: number}} 外積向量
 */
function GetCrossProduct(vector1, vector2){
    return {
        x: vector1.y * vector2.z - vector1.z * vector2.y,
        y: vector1.z * vector2.x - vector1.x * vector2.z,
        z: vector1.x * vector2.y - vector1.y * vector2.x
    };
}

/**
 * 取得三維矩陣的 determinant
 * @param {Array[]} matrix 三維方陣
 * @returns {number} det 值
 */
function GetDeterminant(matrix){
    return matrix[0][0] * matrix[1][1] * matrix[2][2]
         + matrix[0][1] * matrix[1][2] * matrix[2][0]
         + matrix[0][2] * matrix[1][0] * matrix[2][1] 
         - matrix[0][0] * matrix[1][2] * matrix[2][1]
         - matrix[0][1] * matrix[1][0] * matrix[2][2]
         - matrix[0][2] * matrix[1][1] * matrix[2][0];
}

/**
 * 求出從哪一個三維座標旋轉成目前的地球儀
 * @returns {{x: number, y: number, z: number}} 旋轉前座標
 */
function GetRotateSource(){
    // 本來要先求 setting.angle.matrix 旋轉矩陣的反矩陣，再乘以 (0, 0, -1) 來轉回去，但因為
    // [a, b, c] [ 0]
    // [d, e, f] [ 0] = [-c, -f, -i]  只需要求出 adjoint matrix 最後一行，再除以 determinant 並變號就好
    // [g, h, i] [-1]
    
    const m = setting.angle.matrix;
    const det = GetDeterminant(m);
    return {
        x: (m[0][2] * m[1][1] - m[0][1] * m[1][2]) / det,
        y: (m[0][0] * m[1][2] - m[0][2] * m[1][0]) / det,
        z: (m[0][1] * m[1][0] - m[0][0] * m[1][1]) / det
    };
}

/**
 * 用內插法等比例取得東西經 180 度兩邊的點，連線交經線後交點的緯度
 * @param {Array} geo1 點一的地理經緯資料
 * @param {Array} geo2 點二的地理經緯資料
 * @returns {number} 交點的緯度
 */
function GetLatitudeAt180(geo1, geo2){
    const a = 180 - Math.abs(geo1[1]), b = 180 - Math.abs(geo2[1]);
    return (geo1[0] * b + geo2[0] * a) / (a + b);
}

/**
 * 初始化地理經緯度資料轉成立體空間三維座標
 */
function InitGeoToCoor(){
    // 陸地
    for (const data of geoData){
        const convertedData = {};
        convertedData['color'] = data.color;
        convertedData['region'] = [];
        for(const region of data['region']){
            const coordinates = [];
            for(const pair of region ){
                const coor3D = ConvertGeoToCoor(pair);
                coordinates.push(coor3D);
            }
            convertedData['region'].push(coordinates);
        }
        coorData.push(convertedData);
    }
    // 緯線
    // 參數化用基礎角度
    const baseAngle = Math.PI * 2 / setting.sea.divide;
    for (const data of mainLatitude){
        const phi = data.latitude * Math.PI / 180;
        const z = Math.sin(phi);
        const r = Math.cos(phi);
        for (let i = 0; i <= setting.sea.divide; i++){
            const theta = baseAngle * i;
            // 圓參數式 x = r * cos(theta), y = r * sin(theta)
            data.coordinates.push({
                x: r * Math.cos(theta),
                y: r * Math.sin(theta),
                z: z
            });
        }
    }
}
  
/**
 * 繪製地球儀上的陸地多邊形
 * @param {Array} coorData 立體空間三維座標資料
 */
function DrawEarthPolygon(coorData) {
    const stroke = setting.draw.border ? setting.sea.borderColor : 'none';
    for(const data of coorData){
        for(const region of data['region']){
            const polygon = document.createElementNS(xmls, 'polygon');
            polygon.setAttribute('fill', data['color']);
            polygon.setAttribute('stroke', stroke);

            for (let i = 0, n = region.length; i < n; i++){
                region[i] = region[i].x + ',' + region[i].y;
            }
            if (region.length > 0){
                polygon.setAttribute('points', region.join(' '));
                polygon.addEventListener('touchmove', TouchMoveEarth);
                gLand.appendChild(polygon);
            }
        }
    }
}

function RotateBack({x, y, z}, roll, pitch, yaw){
    // https://en.wikipedia.org/wiki/Rotation_matrix#General_3D_rotations 取反矩陣 R_x^{-1}(c) * R_y^{-1}(b) * R_z^{-1}(a) 結果
    // [                       cos(a)*cos(b),                       sin(a)*cos(b),       -sin(b) ] [x]
    // [ -sin(a)*cos(c)+cos(a)*sin(b)*sin(c),  cos(a)*cos(c)+sin(a)*sin(b)*sin(c), cos(b)*sin(c) ] [y]
    // [  sin(a)*sin(c)+cos(a)*sin(b)*cos(c), -cos(a)*sin(c)+sin(a)*sin(b)*cos(c), cos(b)*cos(c) ] [z]
    const cosYaw = Math.cos(yaw);
    const cosPitch = Math.cos(pitch);
    const cosRoll = Math.cos(roll);
    const sinYaw = Math.sin(yaw);
    const sinPitch = Math.sin(pitch);
    const sinRoll = Math.sin(roll);
    
    return {
        x: cosYaw * cosPitch * x + sinYaw * cosPitch * y - sinPitch * z,
        y: (- sinYaw * cosRoll + cosYaw * sinPitch * sinRoll) * x + (cosYaw * cosRoll + sinYaw * sinPitch * sinRoll) * y + cosPitch * sinRoll * z,
        z: (sinYaw * sinRoll + cosYaw * sinPitch * cosRoll) * x + (- cosYaw * sinRoll + sinYaw * sinPitch * cosRoll) * y + cosPitch * cosRoll * z
    };
}

/**
 * 
 * @param {*} param0 
 * @param {*} roll 
 * @param {*} pitch 
 * @param {*} yaw 
 * @returns 
 */
function Rotate({ x, y, z }, roll, pitch, yaw) {
    // https://en.wikipedia.org/wiki/Rotation_matrix#General_3D_rotations 的 R_z(a) * R_y(b) * R_x(c) 結果
    // [ cos(a)*cos(b), cos(a)*sin(b)*sin(c)-sin(a)*cos(c), cos(a)*sin(b)*cos(c)+sin(a)*sin(c) ] [x]
    // [ sin(a)*cos(b), sin(a)*sin(b)*sin(c)+cos(a)*cos(c), sin(a)*sin(b)*cos(c)-cos(a)*sin(c) ] [y]
    // [       -sin(b),                      cos(b)*sin(c),                      cos(b)*cos(c) ] [z]
   
    const cosYaw = Math.cos(yaw);
    const cosPitch = Math.cos(pitch);
    const cosRoll = Math.cos(roll);
    const sinYaw = Math.sin(yaw);
    const sinPitch = Math.sin(pitch);
    const sinRoll = Math.sin(roll);

    return {
        x: cosYaw * cosPitch * x + (cosYaw * sinPitch * sinRoll - sinYaw * cosRoll) * y + (cosYaw * sinPitch * cosRoll + sinYaw * sinRoll) * z,
        y: sinYaw * cosPitch * x + (sinYaw * sinPitch * sinRoll + cosYaw * cosRoll) * y + (sinYaw * sinPitch * cosRoll - cosYaw * sinRoll) * z,
        z: - sinPitch * x + cosPitch * sinRoll * y + cosPitch * cosRoll * z
    };
}

function Rotate2Back({x, y, z}, roll, pitch, yaw){
    const cosYaw = Math.cos(yaw);
    const cosPitch = Math.cos(pitch);
    const cosRoll = Math.cos(roll);
    const sinYaw = Math.sin(yaw);
    const sinPitch = Math.sin(pitch);
    const sinRoll = Math.sin(roll);

    return {
        x: cosYaw * cosPitch * x + (cosYaw * sinPitch * sinRoll + sinYaw * cosRoll) * y + (- cosYaw * sinPitch * cosRoll + sinYaw * sinRoll) * z,
        y: - sinYaw * cosPitch * x + (- sinYaw * sinPitch * sinRoll + cosYaw * cosRoll) * y + (sinYaw * sinPitch * cosRoll + cosYaw * sinRoll) * z,
        z: sinPitch * x - cosPitch * sinRoll * y + cosPitch * cosRoll * z
    };
}
function Rotate2({x, y, z}, roll, pitch, yaw){
    const cosYaw = Math.cos(yaw);
    const cosPitch = Math.cos(pitch);
    const cosRoll = Math.cos(roll);
    const sinYaw = Math.sin(yaw);
    const sinPitch = Math.sin(pitch);
    const sinRoll = Math.sin(roll);

    return {
        x: cosYaw * cosPitch * x - sinYaw * cosPitch * y + sinPitch * z,
        y: (sinYaw * cosRoll + cosYaw * sinPitch * sinRoll) * x + (cosYaw * cosRoll - sinYaw * sinPitch * sinRoll) * y - cosPitch * sinRoll * z,
        z: (sinYaw * sinRoll - cosYaw * sinPitch * cosRoll) * x + (cosYaw * sinRoll + sinYaw * sinPitch * cosRoll) * y + cosPitch * cosRoll * z
    };
}

function MatrixMulti(matrix1, matrix2){
    const matrix = [];
    for(let r = 0; r < 3; r++){
        const row = [];
        for(let c = 0; c < 3; c++){
            let sum = 0;
            for(let i = 0; i < 3; i++){
                sum += matrix1[r][i] * matrix2[i][c];
            }
            row.push(sum);
        }
        matrix.push(row);
    }
    return matrix;
}

/**
 * 作用線性變換的矩陣在三維座標上
 * @param {Array[]} matrix 三階方陣
 * @param {{x: number, y: number, z: number}} point 立體空間三維座標
 * @returns {{x: number, y: number, z: number}} 作用完的座標
 */
function LinearTransform(matrix, point){
    return {
        x: matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2] * point.z,
        y: matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2] * point.z,
        z: matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2] * point.z
    };
}

/**
 * 清除子 DOM
 * @param {HTMLElement} dom 父 DOM
 */
function ClearChildren(dom){
    while(dom.children.length > 0){
        dom.children[0].remove();
    }
}

/**
 * 初始化設定，只會執行一次
 */
function InitSetting(){
    setting.angle.fovTangent = Math.tan(setting.angle.fov * Math.PI / 360);
    setting.svg.baseR = GetProjection({
        x: Math.sqrt(setting.distance.value * setting.distance.value - 1) / setting.distance.value,
        y: 0,
        z: setting.distance.value - 1 / setting.distance.value
    }).x;
    svgMap.style.backgroundColor = setting.sea.color;
}

/**
 * 更新設定
 */
function RefreshSetting(){
    //const w = window.innerWidth * 0.45;
    //const h = window.innerHeight;
    //const l = (w > h) ? h : w;
    const w = Math.max(window.innerWidth, window.innerHeight) * 0.45;
    const h = Math.min(window.innerWidth, window.innerHeight);
    const l = (w > h) ? h : w;
    setting.svg.width = l;
    setting.svg.halfWidth = l / 2;
    setting.svg.height = l;
    setting.svg.halfHeight = l / 2;
    svgEarth.setAttribute('width', l);
    svgEarth.setAttribute('height', l);
    svgMap.setAttribute('width', l);
    svgMap.setAttribute('height', l);
    
    setting.distance.borderDistance = Math.sqrt(setting.distance.value * setting.distance.value - 1 * 1);
    setting.sea.z = setting.distance.value - 1 / setting.distance.value;
    setting.sea.radius = setting.distance.borderDistance / setting.distance.value;
    
    const thisR = GetProjection({ x: setting.sea.radius, y: 0, z: setting.sea.z }).x;
    setting.svg.scale = setting.svg.baseR / thisR;
    setting.svg.scaledWidth = setting.svg.width * setting.svg.scale;
    setting.svg.scaledHeight = setting.svg.height * setting.svg.scale;
    setting.svg.scaledHalfWidth = setting.svg.scaledWidth / 2;
    setting.svg.scaledHalfHeight = setting.svg.scaledHeight / 2;
}

/**
 * 將地理經緯資料轉為立體空間三維座標資料
 * @param {number} latitude 緯度 -90 ~ +90
 * @param {number} longitude 經度 -180 ~ +180
 * @return {{x: number, y: number, z: number}} 三維座標
 */
function ConvertGeoToCoor([latitude, longitude]){
    const phi = latitude * Math.PI / 180;
    const lambda = longitude * Math.PI / 180;
    const r = Math.cos(phi);
    return {
        x: r * Math.cos(lambda),
        y: r * Math.sin(lambda),
        z: Math.sin(phi)
    };
}

/**
 * 將立體空間三維座標資料轉為地理經緯資料
 * @param {{x: number, y: number, z: number}} coor3D 三維座標
 * @returns {[number, number]} 經緯度
 */
function ConvertCoorToGeo(coor3D){
    const phi = Math.asin(coor3D.z);
    const r = Math.cos(phi);
    const latitude = phi * 180 / Math.PI;
    // acos: [-1, 1] => [0, PI]
    //const lambda = Math.acos(coor3D.x / r);
    // asin: [-1, 1] => [-PI/2, PI/2]
    //const lambdaY = Math.asin(y / r);
    let cosLambda;
    if (coor3D.x > r){
        cosLambda = 1;
    }
    else if (coor3D.x < -r){
        cosLambda = -1;
    }
    else{
        cosLambda = coor3D.x / r;
    }

    if (coor3D.y >= 0){
        return [latitude, Math.acos(cosLambda) * 180 / Math.PI];
    }
    else{
        return [latitude, - Math.acos(cosLambda) * 180 / Math.PI];
    }
    //const cosLambda = (coor3D.x > r || coor3D < -r) ? 1 : (coor3D.x / r);
    //return [latitude, ((coor3D.y >= 0) ? Math.acos(cosLambda) : - Math.acos(cosLambda)) * 180 / Math.PI];
/*
    if (coor3D.x >= 0){
        //TODO: 以下應該可簡化
        if (coor3D.y >= 0){
            const lambda = coor3D.x / r;
            if (lambda > 1){
                return [latitude, Math.acos(1) * 180 / Math.PI];
            }
            else{
                return [latitude, Math.acos(lambda) * 180 / Math.PI];
            }
        }
        else{
            const lambda = coor3D.x / r;
            if (lambda > 1){
                return [latitude, - Math.acos(1) * 180 / Math.PI];
            }
            else{
                return [latitude, - Math.acos(lambda) * 180 / Math.PI];
            }
        }
    }
    else{
        if (coor3D.y >= 0){
            const lambda = coor3D.x / r;
            if (lambda < -1){
                return [latitude, Math.acos(-1) * 180 / Math.PI];
            }
            else{
                return [latitude, Math.acos(lambda) * 180 / Math.PI];
            }
        }
        else{
            const lambda = coor3D.x / r;
            if (lambda < -1){
                return [latitude, - Math.acos(-1) * 180 / Math.PI];
            }
            else{
                return [latitude, - Math.acos(lambda) * 180 / Math.PI];
            }
        }
    }
        */
}

function ConvertGeoToMercator(latitude, longitude){
    // https://en.wikipedia.org/wiki/Mercator_projection#Derivation
    // x = R(lambda - lambda_0)
    // y = R * ln(tan(pi / 4 + phi / 2)) = R * ln(tan(phi) + sec(phi))
    //const x = longitude;
    //const y = Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180));

    const phi = latitude * Math.PI / 180;
    return {
        x: (longitude + 180) * setting.svg.width / 360,
        y: - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / 7 * setting.svg.height + setting.svg.halfHeight
    };

}

function ConvertMercatorToGeo(x, y){
    y = (setting.svg.halfHeight - y) * 7 / setting.svg.height;
    return [
        Math.asin(Math.tanh(y)) * 180 / Math.PI,
        x * 360 / setting.svg.width - 180
    ];
}

/**
 * 繪製地圖
 */
function DrawMap(){
    // 一般陸地
    const coorData = [];
    for (let i = 0, n = geoData.length; i < n; i++){
        const data = geoData[i];
        const parsedData = {};
        parsedData['color'] = data.color;
        parsedData['region'] = [];
        if (!data['special']){
            // 無 special 屬性的一般陸地，單純依地理經緯資料取馬卡托投影二維座標
            for(const region of data['region']){
                const coordinates = [];
                for(const pair of region){
                    coordinates.push(ConvertGeoToMercator(pair[0], pair[1]));
                }
                parsedData['region'].push(coordinates);
            }
        }
        else if (data['special'] === '+-180'){
            // 是跨越東經 180 度與西經 180 度的陸地，要切割成東西兩塊陸地
            for(const region of data['region']){
                const coordinatesE = [];
                const coordinatesW = [];
                for(const pair of region){
                    if (pair[1] > 0){
                        // 經度為正數，在地圖右邊
                        coordinatesE.push(ConvertGeoToMercator(pair[0], pair[1]));
                    }
                    else{
                        // 經度為負數，在地圖左邊
                        coordinatesW.push(ConvertGeoToMercator(pair[0], pair[1]));
                    }
                }
                // 理論上這裡要用內插法計算跨越的交點的緯度，讓多邊形更好看，但直接從資料下手，已放好經度 +-180 的點即可
                parsedData['region'].push(coordinatesE);
                parsedData['region'].push(coordinatesW);
            }

        }
        else if (data['special'] === 'southPole'){
            // 包括南極的陸地，即南極洲，資料已處理好從西經 180 度到東經 180 度，所以取完馬卡托二維座標後直接往下，往左，封閉即可
            for(const region of data['region']){
                const coordinates = [];
                for(const pair of region){
                    coordinates.push(ConvertGeoToMercator(pair[0], pair[1]));
                }
                coordinates.push({x: setting.svg.width, y: setting.svg.height});
                coordinates.push({x: 0, y: setting.svg.height});
                parsedData['region'].push(coordinates);
            }
        }
        coorData.push(parsedData);
    }
    DrawMapPolygon(coorData);
    
    // 緯線
    ClearChildren(gMapLatitude);
    if (!setting.draw.latitude){
        return;
    }
    for (const data of mainLatitude){
        const left = ConvertGeoToMercator(data.latitude, -180);
        const right = ConvertGeoToMercator(data.latitude, 180);
        const line = document.createElementNS(xmls, 'line');
        line.setAttribute('x1', left.x);
        line.setAttribute('y1', left.y);
        line.setAttribute('x2', right.x);
        line.setAttribute('y2', right.y);
        line.setAttribute('stroke', data.color);
        if (data.dash.length > 0){
            line.setAttribute('stroke-dasharray', data.dash);
        }
        line.setAttribute('opacity', data.opacity);
        gMapLatitude.appendChild(line);
    }
}

/**
 * 繪製地圖上的圖形
 * @param {Array[]} coorData 馬卡托投影後二維座標
 */
function DrawMapPolygon(coorData){
    ClearChildren(gView);
    for(const data of coorData){
        for(const region of data['region']){
            const polygon = document.createElementNS(xmls, 'polygon');
            polygon.setAttribute('fill', data['color']);
            polygon.setAttribute('stroke', 'none');
            for (let i = 0, n = region.length; i < n; i++){
                region[i] = region[i].x + ',' + region[i].y;
            }
            if (region.length > 0){
                polygon.setAttribute('points', region.join(' '));
                gView.appendChild(polygon);
            }
        }
    }
}


/**
 * 將立體空間三維座標，投影成平面二維座標
 * @param {{x: number, y: number, z: number}} coor3D 三維座標
 * @returns {{x: number, y: number}} 二維座標
 */
function GetProjection(coor3D){
    const z = coor3D.z * setting.angle.fovTangent;
    return {
        x: coor3D.x / z,
        y: coor3D.y / z
    };
}

/**
 * 地球儀上投影座標的伸縮到 svg 的大小，並平移置中
 * @param {{x: number, y: number}} coor2D 原來的二維座標
 */
function Translation(coor2D){
    // 原作法
    //coor2D.x = coor2D.x * setting.svg.width + setting.svg.halfWidth;
    //coor2D.y = coor2D.y * setting.svg.height + setting.svg.halfHeight;
    // 放大縮小使用延展後的寬度，位移置中使用原寬度
    coor2D.x = coor2D.x * setting.svg.scaledWidth + setting.svg.halfWidth;
    coor2D.y = coor2D.y * setting.svg.scaledHeight + setting.svg.halfHeight;
}

/**
 * 繪製地球儀上的海洋
 */
function DrawSea(){
    // 海背景長得都一樣，畫一次就好了，用無任何旋轉的初始畫面即可
    const coordinates = [];
    const polygon = document.createElementNS(xmls, 'polygon');
    polygon.setAttribute('fill', setting.sea.color);
    polygon.setAttribute('stroke', 'none');
    const baseAngle = Math.PI * 2 / setting.sea.divide;
    for (let i = 0; i < setting.sea.divide; i++){
        // 圓形參數式 x = r * cos(theta), y = r * sin(theta)
        const coor3D = {
            x: setting.sea.radius * Math.cos(baseAngle * i),
            y: setting.sea.radius * Math.sin(baseAngle * i),
            z: setting.sea.z
        };
        const coor2D = GetProjection(coor3D);
        Translation(coor2D);
        coordinates.push(coor2D.x + ',' + coor2D.y);
    }
    polygon.setAttribute('points', coordinates.join(' '));
    ClearChildren(gSea);
    gSea.appendChild(polygon);

    // 計算畫面上，海的半徑，再依比例設好拖拉 drag 與旋轉 spin 的分界距離
    const seaDisplay2D = GetProjection({ x: setting.sea.radius, y: 0, z: setting.sea.z });
    Translation(seaDisplay2D);
    setting.distance.dragRadius = (seaDisplay2D.x - setting.svg.halfWidth) * setting.distance.dragRatio;
}

/**
 * 將點挪到最靠近海的邊界上的點
 * @param {{x: number, y: number, z: number}}} coor3D 立體空間中的點
 */
function MoveToBorder(coor3D){
    // 利用 (x, y, z) 在 x-y 平面上的垂足 (x, y, 0)，到球心的距離，和海半徑來得到縮放比例
    const ratio = setting.sea.radius / Math.sqrt(coor3D.x * coor3D.x + coor3D.y * coor3D.y);
    // 依比例縮放 x 和 y 座標，就得到通過 (x, y, z) 和球心 (0, 0, 0) 且垂直 x-y 平面的平面，與海的交點（同號則為近點）
    coor3D.x = coor3D.x * ratio;
    coor3D.y = coor3D.y * ratio;
    coor3D.z = setting.sea.z;
}

/**
 * 視距的變動
 * @param {boolean} isZoomIn true 為拉近靠近，false 為拉遠退後
 */
function Zoom(isZoomIn){
    const m = setting.distance.min, M = setting.distance.max;
    // 靠近則距離變小，拉遠則變大
    setting.distance.x += isZoomIn ? - setting.distance.offset : setting.distance.offset;
    // y = arctan(x) 圖形的伸縮，像這樣 ＿／￣ 限制在 m 和 M 之間
    setting.distance.value = Math.atan(setting.distance.x) * (M - m) / Math.PI + (M + m)/ 2;

    RefreshSetting();
    DrawSea();
    DrawEarth();
}

/**
 * 點擊地圖要更新地球儀，以點擊處為顯示中心
 * @param {PointerEvent} event 滑鼠點擊事件
 */
function ClickMap(event){
    // 從點擊地圖的座標，即馬卡托投影上的二維座標反求地理經緯度
    const geo = ConvertMercatorToGeo(event.offsetX, event.offsetY);
    // 從點擊的地理經緯度求得立體空間上的三維座標
    const coor3D = ConvertGeoToCoor(geo);
    // 經到此之前的旋轉矩陣，得到旋轉前的顯示座標，目的是將這個座標轉成以他為中心，也就是轉成 (0, 0, -1)
    const from = LinearTransform(setting.angle.matrix, coor3D);
    const to = { x: 0, y: 0, z: -1 };
    // 內積值
    const cos = GetDotProduct(from, to);
    // 旋轉軸
    const axis = GetCrossProduct(from, to);
    Normalize(axis);
    const matrixK = GetMatrixK(axis);
    const matrixM = GetMatrixM(cos, matrixK);

    setting.angle.matrix = MatrixMulti(matrixM, setting.angle.matrix);
    // 更新目前畫面中心的立體空間三維座標
    setting.aim.coor3D = coor3D;
    // 依新的旋轉矩陣再重繪地球儀
    DrawEarth();
}

/**
 * 繪製地圖上顯示視角的邊界，即地球儀的中心到海的邊緣為圓周的正圓在地圖上的呈現
 */
function DrawBoundary(){
    // 不管之前有畫沒畫都清除
    ClearChildren(gBoundary);
    // 若設定不繪製則退出
    if (!setting.draw.boundary){
        return;
    }
    // 地球儀顯示視角的中心，抽象上的立體座標
    const viewCenter = setting.aim.coor3D;
    // 取得以 coor3D 為法線的互相垂直的單位向量
    const base = GetOrthogonalBase(viewCenter);
    // 圓參數化的基本角，為 2pi 被設定的數量等分
    const baseAngle = Math.PI * 2 / setting.sea.divide;
    // coor3D 是球上的點，乘上 1/d 會得海的圓心，所以直接除以 d 即可
    const circleCenter = {
        x: viewCenter.x / setting.distance.value,
        y: viewCenter.y / setting.distance.value,
        z: viewCenter.z / setting.distance.value,
    };
    const borderGeo = [];
    for (let i = 0; i < setting.sea.divide; i++){
        const angle = baseAngle * i;
        const rCos = setting.sea.radius * Math.cos(angle);
        const rSin = setting.sea.radius * Math.sin(angle);
        // 圓周上的動點 P = C + R * cos(theta) * U + R * sin(theta) * V
        const coor3D = {
            x: circleCenter.x + base.u.x * rCos + base.v.x * rSin,
            y: circleCenter.y + base.u.y * rCos + base.v.y * rSin,
            z: circleCenter.z + base.u.z * rCos + base.v.z * rSin
        };
        // 將立體空間三維座標轉回地理經緯度
        borderGeo.push(ConvertCoorToGeo(coor3D));
    }
    // 北極的三維座標
    const northPole = LinearTransform(setting.angle.matrix, {x: 0, y: 0, z: 1});
    northPole.z += setting.distance.value;
    // 南極的三維座標
    const southPole = LinearTransform(setting.angle.matrix, {x: 0, y: 0, z: -1});
    southPole.z += setting.distance.value;

    let regionList;
    if (GetNorm(northPole) <= setting.distance.borderDistance){
        // 邊界包含北極
        regionList = DrawBoundaryPole(true, borderGeo);
    }
    else if (GetNorm(southPole) <= setting.distance.borderDistance){
        // 邊界包含南極
        regionList = DrawBoundaryPole(false, borderGeo);
    }
    else{
        // 檢查是否跨經線正負180度，有的話記下跳躍的 index，走 DrawBoundaryCross 方法；無跨越的話走 DrawBoundaryNormal 方法
        let cross180 = false, singular1 = -1, singular2 = -1;
        for (let i = 0, n = borderGeo.length - 1; i < n; i++){
            if ((borderGeo[i][1] > 90 && borderGeo[i + 1][1] < -90) || (borderGeo[i][1] < -90 && borderGeo[i + 1][1] > 90)){
                if (singular1 === -1){
                    cross180 = true;
                    singular1 = i;
                }
                else{
                    singular2 = i;
                    break;
                }
            }
        }
        if (cross180){
            // 有跨過經線正負180度，不包含北極南極，則切出兩塊邊界
            regionList = DrawBoundaryCross(singular1, singular2, borderGeo);
        }
        else{
            // 沒有跨過經線正負180度，也不包含北極南極，最簡單的畫出完整邊界
            regionList = DrawBoundaryNormal(borderGeo);
        }
    }
    
    
    for(const region of regionList){
        const polygon = document.createElementNS(xmls, 'polygon');
        polygon.setAttribute('fill', setting.boundary.color);
        polygon.setAttribute('opacity', setting.boundary.opacity);
        polygon.setAttribute('stroke', setting.boundary.stroke);
        polygon.setAttribute('points', region.join(' '));
        gBoundary.appendChild(polygon);
    }
}

/**
 * 繪製邊界的南北極部份
 * @param {boolean} isNorthPole 是否為北極，true 為北極，false 為南極
 * @param {Array[]} borderGeo 地理經緯度資料
 * @returns {string[][]} 一個要組成 Polyline 的 points 的資料
 */
function DrawBoundaryPole(isNorthPole, borderGeo){
    let singular = -1;
    const n = borderGeo.length;
    // 取得跨越東西經 180 度的點的 index
    for (let i = 0, m = n - 1; i < m; i++){
        if ((borderGeo[i][1] > 90 && borderGeo[i + 1][1] < -90) || (borderGeo[i][1] < -90 && borderGeo[i + 1][1] > 90)){
            singular = i;
            break;
        }
    }
    // 取得跨越東西經兩點的連線段與東西經 180 度之交點緯度，若上面找不到，表示這個邊界陣列完全落在地圖內，恰好陣列第一個與最後一個是跨過東西經 180 度的兩點
    const latitude = singular === -1 ? GetLatitudeAt180(borderGeo[0], borderGeo[n - 1]) : GetLatitudeAt180(borderGeo[singular], borderGeo[singular + 1]);
    const interpolationE = ConvertGeoToMercator(latitude, 180);
    const interpolationW = ConvertGeoToMercator(latitude, -180);

    const borderMercator = [];
    if (isNorthPole){
        // 包含北極的邊界線，是從東邊往西邊畫的，所以從東經 180 度開始，連完後補西經 180 度的點，往上，再往右，封閉
        borderMercator.push(interpolationE.x + ',' + interpolationE.y);
        for (let i = singular + 1; i < n; i++){
            const geo = borderGeo[i];
            const coor2D = ConvertGeoToMercator(geo[0], geo[1]);
            borderMercator.push(coor2D.x + ',' + coor2D.y);
        }
        for (let i = 0; i < singular; i++){
            const geo = borderGeo[i];
            const coor2D = ConvertGeoToMercator(geo[0], geo[1]);
            borderMercator.push(coor2D.x + ',' + coor2D.y);
        }
        borderMercator.push(interpolationW.x + ',' + interpolationW.y);
        borderMercator.push('0,0');
        borderMercator.push(setting.svg.width + ',0');
    }
    else{
        // 包含南極的邊界線，是從西邊往東邊畫的，所以從西經 180 度開始，連完後補東經 180 度的點，往下，再往左，封閉
        borderMercator.push(interpolationW.x + ',' + interpolationW.y);
        for (let i = singular + 1; i < n; i++){
            const geo = borderGeo[i];
            const coor2D = ConvertGeoToMercator(geo[0], geo[1]);
            borderMercator.push(coor2D.x + ',' + coor2D.y);
        }
        for (let i = 0; i < singular; i++){
            const geo = borderGeo[i];
            const coor2D = ConvertGeoToMercator(geo[0], geo[1]);
            borderMercator.push(coor2D.x + ',' + coor2D.y);
        }
        borderMercator.push(interpolationE.x + ',' + interpolationE.y);
        borderMercator.push(setting.svg.width + ',' + setting.svg.height);
        borderMercator.push('0,' + setting.svg.height);
    }
    return [borderMercator];
}

/**
 * 繪製邊界的跨越東西經 180 度的部份
 * @param {number} singular1 第一次 +180 跳 -180 的 index
 * @param {number} singular2 第二次 +180 跳 -180 的 index
 * @param {Array[]} borderGeo 地理經緯度資料
 * @returns {string[][]} 兩個要組成 Polyline 的 points 的資料
 */
function DrawBoundaryCross(singular1, singular2, borderGeo){
    const borderMercatorE = [];
    const borderMercatorW = [];

    for (let i = 0, n = borderGeo.length; i < n; i++){
        const geo = borderGeo[i];
        const coor2D = ConvertGeoToMercator(geo[0], geo[1]);
        if (geo[1] >= 0){
            // 經度為正數放入右邊的邊界 polygon 裡
            borderMercatorE.push(coor2D.x + ',' + coor2D.y);
        }
        else{
            // 經度為負數放入左邊的邊界 polygon 裡
            borderMercatorW.push(coor2D.x + ',' + coor2D.y);
        }
        if ((i === singular1 || i === singular2) && i !== n - 1){
            // 若此點與下一個點恰好跨越東西經 180 度，則用內插法取得這兩點與東西經 180 度的交點，會有兩個 singular 是因為封閉區域跨過去就會跨過來
            // 插入點作法，先依等比例取得緯度，再分別用東經 180 度與西經 180 度取得地圖上馬卡托投影的二維座標，讓兩塊邊界看起來不會在地圖邊緣有縫隙
            const latitude = GetLatitudeAt180(geo, borderGeo[i + 1]);
            const interpolationE = ConvertGeoToMercator(latitude, 180);
            const interpolationW = ConvertGeoToMercator(latitude, -180);
            borderMercatorE.push(interpolationE.x + ',' + interpolationE.y);
            borderMercatorW.push(interpolationW.x + ',' + interpolationW.y);
        }
    }
    return [borderMercatorE, borderMercatorW];
}

/**
 * 繪製邊界的基本部份
 * @param {Array[]} borderGeo 地理經緯度資料
 * @returns {string[][]} 一個要組成 Polyline 的 points 的資料
 */
function DrawBoundaryNormal(borderGeo){
    const borderMercator = [];
    for (let i = 0, n = borderGeo.length; i < n; i++){
        const geo = borderGeo[i];
        const coor2D = ConvertGeoToMercator(geo[0], geo[1]);
        borderMercator.push(coor2D.x + ',' + coor2D.y);
    }
    return [borderMercator];
}

/**
 * 繪製地球儀上的主要緯線
 */
function DrawMainLatitude(){
    // 不管之前有畫沒畫都清除
    ClearChildren(gMainLatitude);
    // 設定不繪製則退出
    if (!setting.draw.latitude){
        return;
    }
    for(const data of mainLatitude){
        let points = [];
        let before = null;
        let i = 0, n = data.coordinates.length;
        // 從經度 0 -> 180 -> -180 -> 0 的方向，碰到邊界則停
        for (; i < n; i++){
            const rotated = LinearTransform(setting.angle.matrix, data.coordinates[i]);
            rotated.z += setting.distance.value;
            const distance = GetNorm(rotated);
            if (distance <= setting.distance.borderDistance){
                // 可視範圍內的點
                if (points.length === 0 && before){
                    // 若前面有不在可視範圍內的點，將讓點移到海的邊邊上，投影這一點讓他顯示成為畫緯度線的其中一點，才不會有斷掉的感覺
                    MoveToBorder(before);
                    const beforeProjected = GetProjection(before);
                    Translation(beforeProjected);
                    points.push(beforeProjected.x + ',' + beforeProjected.y);
                }
                // 加入要畫的折線段中
                const projected = GetProjection(rotated);
                Translation(projected);
                points.push(projected.x + ',' + projected.y);
            }
            else{
                // 非可視範圍的點
                if (points.length === 0){
                    // 如果可視範圍的點都還沒有出現，就持續更新 before 為這一個點，為連接海邊邊做準備
                    before = rotated;
                }
                else{
                    // 若已經有可視範圍的點了，但又進來這裡，由於封閉性的關係，表示接下來的點都看不到了，補畫移到海邊邊的這一點後，結束掉
                    MoveToBorder(rotated);
                    const projected = GetProjection(rotated);
                    Translation(projected);
                    points.push(projected.x + ',' + projected.y);
                    break;
                }
            }
        }

        before = null;
        let points2 = [];
        // 一樣是經度 0 -> 180 -> -180 -> 0 的方向，但是從邊界開始，到 0 則停
        // 雖然是做出來了但有夠醜，有空再重構
        for (;i < n; i++){
            const rotated = LinearTransform(setting.angle.matrix, data.coordinates[i]);
            rotated.z += setting.distance.value;
            const distance = GetNorm(rotated);
            if (distance <= setting.distance.borderDistance){
                if (points2.length === 0 && before){
                    MoveToBorder(before);
                    const beforeProjected = GetProjection(before);
                    Translation(beforeProjected);
                    points2.push(beforeProjected.x + ',' + beforeProjected.y);
                }
                const projected = GetProjection(rotated);
                Translation(projected);
                points2.push(projected.x + ',' + projected.y);
            }
            else{
                if (points2.length === 0){
                    before = rotated;
                }
                else{
                    MoveToBorder(rotated);
                    const projected = GetProjection(rotated);
                    Translation(projected);
                    points2.push(projected.x + ',' + projected.y);
                    break;
                }
            }
        }
        // points 是 0 到邊界，points2 是邊界到 0，所以是把 points 接在 points2 的後面
        for (const p of points){
            points2.push(p);
        }
        if (points2.length > 0){
            const polyline = document.createElementNS(xmls, 'polyline');
            polyline.setAttribute('points', points2.join(' '));
            if (data.dash.length > 0){
                polyline.setAttribute('stroke-dasharray', data.dash);
            }
            polyline.setAttribute('fill', 'none');
            polyline.setAttribute('stroke', data.color);
            polyline.setAttribute('opacity', data.opacity);
            gMainLatitude.appendChild(polyline);
        }
    }
}

/**
 * 取得垂直的兩組單位法向量
 * @param {{x: number, y: number, z: number}} n 法向量
 * @returns {{u: {x: number, y: number, z: number}, v: {x: number, y: number, z: number}}} 兩組向量
 */
function GetOrthogonalBase(n){
    const u = {};
    if (n.x !== 0){
        // (a, b, c) 與 (- b/a, 1, 0) 內積為 0，必垂直
        u.x = - n.y / n.x;
        u.y = 1;
        u.z = 0;

    }
    else if (n.y !== 0){
        // (a, b, c) 與 (1, - a/b, 0) 內積為 0，必垂直
        u.x = 1;
        u.y = - n.x / n.y;
        u.z = 0;
    }
    else if (n.z !== 0){
        // (a, b, c) 與 (0, 1, - b/c) 內積為 0，必垂直
        u.x = 0;
        u.y = 1;
        u.z = - n.y / n.z;
    }
    else{
        //throw new Error('向量 (0, 0, 0) 不存在，無法求正交基底向量組');
        // 為一開始還沒旋轉過，直接回傳 (1, 0, 0) 與 (0, 1, 0) 來使用
        return [ { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0} ];
    }
    // 單位化
    Normalize(u);
    // 外積求得與 n 和 u 都垂直的向量，則 u 和 v 都垂直 n
    const v = GetCrossProduct(u, n)
    // 單位化
    Normalize(v);
    return {u, v};
}

/**
 * 滑鼠在地圖上懸停時，將十字標記移動的事件
 * @param {MouseEvent} event 滑鼠懸停事件
 */
function HoverMap(event){
    lineHor.setAttribute('x1', event.offsetX - setting.aim.size);
    lineHor.setAttribute('y1', event.offsetY);
    lineHor.setAttribute('x2', event.offsetX + setting.aim.size);
    lineHor.setAttribute('y2', event.offsetY);

    lineVer.setAttribute('x1', event.offsetX);
    lineVer.setAttribute('y1', event.offsetY - setting.aim.size);
    lineVer.setAttribute('x2', event.offsetX);
    lineVer.setAttribute('y2', event.offsetY + setting.aim.size);
}

/**
 * 最否顯示邊界的設定切換
 */
function ToggleDrawBoundary(){
    setting.draw.boundary = !setting.draw.boundary;
    DrawEarth();
}

/**
 * 是否顯示主要緯線的設定切換
 */
function ToggleDrawLatitude(){
    setting.draw.latitude = !setting.draw.latitude;
    DrawEarth();
    DrawMap();
}

/**
 * 是否顯示陸地邊界的設定切換
 */
function ToggleDrawBorder(){
    setting.draw.border = !setting.draw.border;
    DrawEarth();
}

//TODO: map 平移到 latitude 0 

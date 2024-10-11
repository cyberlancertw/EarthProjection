// 以 https://www.youtube.com/watch?v=eoXn6nwV694 與 https://github.com/carltheperson/3d-to-2d-example/blob/main/index.ts 為基礎


const xmls = 'http://www.w3.org/2000/svg';

const svgEarth = document.getElementById('svgEarth');
const svgMap = document.getElementById('svgMap');
const gSea = document.getElementById('gSea');
const gLand = document.getElementById('gLand');
const lineHor = document.getElementById('lineHor');
const lineVer = document.getElementById('lineVer');

const setting = {
    lock: false,
    svgWidth: 0,
    svgHeight: 0,
    mouse: {
        x: 0,
        y: 0
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
        yaw: 0
    },
    distance: {
        value: 5,
        min: 1,
        max: 9
    },
    sea: {
        //color: '#81c7d4',
        color: '#a1e7f4',
        borderColor: '#808080',
        divide: 72,
        z: 0,
        radius: 0
    },
    aim: {
        size: 5,
        x: 0,
        y: 0
    }
};

InitSetting();
InitGeoToCoor();

svgEarth.addEventListener('mousedown', ClickEarth);
svgEarth.addEventListener("mousemove", DrawEarth);
svgMap.addEventListener('click', ClickMap);
svgMap.addEventListener('mousemove', HoverMap);
document.getElementById('btnZoomIn').addEventListener('click', function(){ Zoom(true);});
document.getElementById('btnZoomOut').addEventListener('click', function(){ Zoom(false);});
DrawSea();
DrawEarth();
DrawMap();

function ClickEarth(event){
    setting.last.x = event.offsetX % setting.svgWidth;
    setting.last.y = event.offsetY % setting.svgHeight;
}

function DrawEarth(event) {
    // 有點滑鼠時只有按著左鍵時才會重畫，若滑鼠是懸停的就離開
    if (event && event.buttons !== 1){
        return;
    }
    if (setting.lock){
        return;
    }
    setting.lock = true;
    if (event){
        setting.mouse.x = setting.mouse.x + event.offsetX - setting.last.x;
        setting.mouse.y = setting.mouse.y + event.offsetY - setting.last.y;
    
        setting.last.x = event.offsetX;
        setting.last.y = event.offsetY;
    }

    CalculateAngle();
    const mouseX = setting.mouse.x;
    const mouseY = setting.mouse.y;
    ClearEarth();

    

    const borderZ = 0;
    const drawData = [];
    for (const data of coorData){
        const parsedData = {};
        parsedData['color'] = data.color;
        parsedData['region'] = [];
        for(const region of data['region']){
            let count = 0;
            const coordinates = [];
            for(const coor3D of region ){
                //const rotated = Rotate(coor3D, mouseYratio, mouseXratio, 0);
                const rotated = Rotate(coor3D, setting.angle.roll, setting.angle.pitch, setting.angle.yaw);
                rotated.z = rotated.z + setting.distance.value;

                const distance = GetDistance(rotated);
                if (distance < setting.borderDistance){
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
    DrawEarthPolygon(drawData);

}

function CalculateAngle(){
    setting.angle.roll = (setting.mouse.y / setting.svgHeight) * Math.PI;
    setting.angle.pitch = (setting.mouse.x / setting.svgWidth) * Math.PI;
}

function InitGeoToCoor(){
    for (const data of geoData){
        const convertedData = {};
        convertedData['color'] = data.color;
        convertedData['region'] = [];
        for(const region of data['region']){
            const coordinates = [];
            for(const pair of region ){
                const coor3D = ConvertGeoToCoor(pair[0], pair[1]);
                coordinates.push(coor3D);
            }
            convertedData['region'].push(coordinates);
        }
        coorData.push(convertedData);
    }
}
  
/**
 * 
 * @param {Array} coorData 
 */
function DrawEarthPolygon(coorData) {

    for(const data of coorData){
        for(const region of data['region']){
            const polygon = document.createElementNS(xmls, 'polygon');
            polygon.setAttribute('fill', data['color']);
            polygon.setAttribute('stroke', setting.sea.borderColor);

            for (let i = 0, n = region.length; i < n; i++){
                region[i] = region[i].x + ',' + region[i].y;
            }
            if (region.length > 0){
                polygon.setAttribute('points', region.join(' '));
                gLand.appendChild(polygon);
            }
        }
    }
    setting.lock = false;
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
    // https://en.wikipedia.org/wiki/Rotation_matrix#General_3D_rotations 的 R_z(a) * R_y(b) * R_z(c) 結果
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

function ClearEarth(){
    while(gLand.children.length > 0){
        gLand.children[0].remove();
    }
}

function InitSetting(){
    //setting.svgWidth = window.innerWidth * 0.45;
    //setting.svgHeight = window.innerHeight;
    const w = window.innerWidth * 0.45;
    const h = window.innerHeight;
    const l = (w > h) ? h : w;
    setting.svgWidth = l;
    setting.svgHeight = l;
    svgEarth.setAttribute('width', l);
    svgEarth.setAttribute('height', l);
    svgMap.setAttribute('width', l);
    svgMap.setAttribute('height', l);
    setting.angle.fovTangent = Math.tan(setting.angle.fov * Math.PI / 360);
    setting.borderDistance = Math.sqrt(setting.distance.value * setting.distance.value - 1 * 1);
    setting.sea.z = setting.distance.value - 1 / setting.distance.value;
    setting.sea.radius = setting.borderDistance / setting.distance.value;
}

/**
 * 
 * @param {number} latitude 緯度 -90 ~ +90
 * @param {number} longitude 經度 -180 ~ +180
 */
function ConvertGeoToCoor(latitude, longitude){
    const phi = latitude * Math.PI / 180;
    const lambda = longitude * Math.PI / 180;
    const r = Math.cos(phi);
    return {
        x: r * Math.cos(lambda),
        y: r * Math.sin(lambda),
        z: Math.sin(phi)
    };
}


function ConvertGeoToMercator(latitude, longitude){
    // https://en.wikipedia.org/wiki/Mercator_projection#Derivation
    // x = R(lambda - lambda_0)
    // y = R * ln(tan(pi / 4 + phi / 2)) = R * ln(tan(phi) + sec(phi))
    //const x = longitude;
    //const y = Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180));

    return {
        x: (longitude + 180) * setting.svgWidth / 360,
        y: - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180)) / 7 * setting.svgHeight + setting.svgHeight / 2

    };

}

function ConvertMercatorToGeo(x, y){
    console.dir([x, y]);
    //return latitude, longitude
}

function DrawMap(){
    const coorData = [];
    for (let i = 0, n = geoData.length; i < n; i++){
        const data = geoData[i];
        const parsedData = {};
        parsedData['color'] = data.color;
        parsedData['region'] = [];
        for(const region of data['region']){
            const coordinates = [];
            let isCrossLatitude180 = false;
            for(const pair of region ){
                coordinates.push(ConvertGeoToMercator(pair[0], pair[1]));
            }
            parsedData['region'].push(coordinates);
        }
        coorData.push(parsedData);
    }
    DrawMapPolygon(coorData);
}

function DrawMapPolygon(coorData){
    
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

function GetDistance(coordinate){
    return Math.sqrt(coordinate.x * coordinate.x + coordinate.y * coordinate.y + coordinate.z * coordinate.z);
}


function GetProjection(coor3D){
    const z = coor3D.z * setting.angle.fovTangent;
    return {
        x: coor3D.x / z,
        y: coor3D.y / z
    };
}

function Translation(coor2D){
    coor2D.x = coor2D.x * setting.svgWidth + setting.svgWidth / 2;
    coor2D.y = coor2D.y * setting.svgHeight + setting.svgHeight / 2;
}

function DrawSea(){
    while(gSea.children.length > 0){
        gSea.children[0].remove();
    }
    // 海背景長得都一樣，畫一次就好了，用無任何旋轉的初始畫面即可
    const coordinates = [];
    const polygon = document.createElementNS(xmls, 'polygon');
    polygon.setAttribute('fill', setting.sea.color);
    polygon.setAttribute('stroke', 'none');
    const seaRadius = setting.borderDistance / setting.distance.value;
    const baseAngle = Math.PI * 2 / setting.sea.divide;
    for (let i = 0; i < setting.sea.divide; i++){
        // 圓形參數式 x = r * cos(theta), y = r * sin(theta)
        const coor3D = {
            x: seaRadius * Math.cos(baseAngle * i),
            y: seaRadius * Math.sin(baseAngle * i),
            z: setting.sea.z
        };
        const coor2D = GetProjection(coor3D);
        Translation(coor2D);
        coordinates.push(coor2D.x + ',' + coor2D.y);
    }
    polygon.setAttribute('points', coordinates.join(' '));
    gSea.appendChild(polygon);
}

function MoveToBorder(coor3D){
    const ratio = setting.sea.radius / Math.sqrt(coor3D.x * coor3D.x + coor3D.y * coor3D.y);
    coor3D.x = coor3D.x * ratio;
    coor3D.y = coor3D.y * ratio;
    coor3D.z = setting.sea.z;
}

function Zoom(isZoomIn){
    console.log(setting.distance.value);
    if (isZoomIn){
        if (setting.distance.min < setting.distance.value){
            setting.distance.value -= 0.5;
        }
    }
    else{
        if (setting.distance.value < setting.distance.max)
        setting.distance.value += 0.5;
    }
    InitSetting();
    DrawSea();
    DrawEarth();
}


function ClickMap(event){
    const coor3D = ConvertMercatorToGeo(event.offsetX, event.offsetY);
}

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


//TODO: map click 移動 earth
//TODO: map drag 重繪 map border
//TODO: earth drag 
//TODO: map 平移到 latitude 0 
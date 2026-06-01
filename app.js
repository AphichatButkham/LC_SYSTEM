// ======================================================
// UUID
// ======================================================

const SERVICE_UUID =
"4fafc201-1fb5-459e-8fcc-c5c9c331914b";

const CHARACTERISTIC_UUID =
"beb5483e-36e1-4688-b7f5-ea07361b26a8";

// ======================================================
// BLE Variables
// ======================================================

let device=null;
let server=null;
let service=null;
let characteristic=null;

// ======================================================
// UI
// ======================================================

const connectBtn=
document.getElementById(
"connectBtn"
);

const statusText=
document.getElementById(
"status"
);

// ======================================================
// Log
// ======================================================

function addLog(msg,type="info"){

console.log(msg);

const logBox=
document.getElementById(
"log"
);

if(!logBox)return;

const div=
document.createElement("div");

div.textContent=msg;

if(type==="err"){

div.style.color="#ff4444";

}

logBox.prepend(div);

}

// ======================================================
// Connected UI
// ======================================================

function setConnectedUI(state){

if(state){

statusText.innerText=
"CONNECTED";

connectBtn.innerText=
"DISCONNECT";

}

else{

statusText.innerText=
"DISCONNECTED";

connectBtn.innerText=
"CONNECT BLE";

}

}

// ======================================================
// Connect
// ======================================================

async function connectBLE(){

if(!navigator.bluetooth){

addLog(
"Web Bluetooth not supported",
"err"
);

alert(
"Browser does not support BLE"
);

return;

}

try{

addLog(
"Scanning..."
);

device=
await navigator.bluetooth.requestDevice({

filters:[

{

namePrefix:"LC"

}

],

optionalServices:[

SERVICE_UUID

]

});

addLog(
"Selected: "+
device.name
);

device.addEventListener(

"gattserverdisconnected",

onDisconnected

);

server=
await device.gatt.connect();

addLog(
"GATT Connected"
);

service=
await server.getPrimaryService(

SERVICE_UUID

);

characteristic=
await service.getCharacteristic(

CHARACTERISTIC_UUID

);

await characteristic.startNotifications();

characteristic.addEventListener(

"characteristicvaluechanged",

handleData

);

setConnectedUI(true);

addLog(
"BLE Ready"
);

}

catch(error){

console.error(error);

addLog(

error.message,

"err"

);

setConnectedUI(false);

}

}

// ======================================================
// Disconnect
// ======================================================

async function disconnectBLE(){

if(device){

device.gatt.disconnect();

}

}

// ======================================================
// Auto Disconnect
// ======================================================

function onDisconnected(){

addLog(
"BLE Disconnected",
"err"
);

setConnectedUI(false);

}

// ======================================================
// Receive JSON
// ======================================================

function handleData(event){

try{

const value=
new TextDecoder()
.decode(

event.target.value
);

const data=
JSON.parse(value);

updateValue(

"lc1",
data.lc1
);

updateValue(

"lc2",
data.lc2
);

updateValue(

"lc3",
data.lc3
);

updateValue(

"lc4",
data.lc4
);

updateValue(

"total",
data.total
);

}
catch(error){

console.log(error);

}

}

// ======================================================
// Update HTML
// ======================================================

function updateValue(

id,
value

){

const el=
document.getElementById(
id
);

if(el){

el.innerText=
value;

}

}

// ======================================================
// Send Command
// ======================================================

async function sendCommand(cmd){

if(!characteristic){

return;

}

const encoder=
new TextEncoder();

await characteristic.writeValue(

encoder.encode(cmd)

);

addLog(
"CMD: "+cmd
);

}

// ======================================================
// Button
// ======================================================

connectBtn.addEventListener(

"click",

()=>{

if(

device &&
device.gatt.connected

){

disconnectBLE();

}

else{

connectBLE();

}

}

);

// ======================================================
// Tare Buttons
// ======================================================

document
.getElementById(
"tareAll"
)
?.addEventListener(

"click",

()=>{

sendCommand(
"tare_all"
);

}

);

document
.getElementById(
"tare1"
)
?.addEventListener(

"click",

()=>{

sendCommand(
"tare1"
);

}

);

document
.getElementById(
"tare2"
)
?.addEventListener(

"click",

()=>{

sendCommand(
"tare2"
);

}

);

document
.getElementById(
"tare3"
)
?.addEventListener(

"click",

()=>{

sendCommand(
"tare3"
);

}

);

document
.getElementById(
"tare4"
)
?.addEventListener(

"click",

()=>{

sendCommand(
"tare4"
);

}

);

setConnectedUI(false);

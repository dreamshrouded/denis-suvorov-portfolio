/* This controls navigation visibility only. GitHub remains the write-access boundary. */
(()=>{
'use strict';
const ownerId=88829985;
const channelName='denis-portfolio-owner-v1';
const panelName='portfolio-site-management';
const isPanel=Boolean(document.querySelector('#connect-form'));
let channel;
try { if ('BroadcastChannel' in window) channel=new BroadcastChannel(channelName); } catch (_) {}
if(isPanel){
  let credential='',verifiedAt=0,generation=0,inFlight;
  function clear(){
    generation++;credential='';verifiedAt=0;inFlight=undefined;
    channel?.postMessage({type:'owner-left'});
  }
  async function verify(){
    if(!credential)return false;
    if(Date.now()-verifiedAt<30000)return true;
    if(inFlight)return inFlight;
    const current=generation;
    const secret=credential;
    inFlight=(async()=>{
      try{
        const response=await fetch('https://api.github.com/user',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${secret}`}});
        if(!response.ok)throw new Error('GitHub не подтвердил аккаунт. Проверьте ключ доступа.');
        const user=await response.json();
        if(user.id!==ownerId)throw new Error('Управление доступно только аккаунту владельца сайта dreamshrouded.');
        if(current!==generation)return false;
        verifiedAt=Date.now();return true;
      }catch(error){if(current===generation)clear();throw error;}
      finally{if(current===generation)inFlight=undefined;}
    })();
    return inFlight;
  }
  window.PortfolioOwnerSession=Object.freeze({
    async connect(secret){
      clear();credential=secret;
      if(!await verify())throw new Error('Подключение изменилось. Повторите вход.');
      window.name=panelName;
      channel?.postMessage({type:'owner-ready'});
    },
    clear
  });
  if(channel)channel.onmessage=async event=>{
    const data=event.data;
    if(data?.type!=='owner-check'||typeof data.nonce!=='string'||data.nonce.length>100)return;
    try{if(await verify())channel.postMessage({type:'owner-confirmed',nonce:data.nonce,ownerId});}catch(_){}
  };
  window.addEventListener('pagehide',clear);
  return;
}
// The preview always represents the public visitor view.
const template=document.querySelector('#owner-header-template');
if(!channel||!template||window.parent!==window)return;
let nonce='',expiry=0,expiryTimer,link;
const header=document.querySelector('.header');
function hide(){
  clearTimeout(expiryTimer);expiry=0;
  link?.remove();link=undefined;header?.classList.remove('owner-connected');
}
function request(){
  if(document.hidden)return;
  nonce=crypto.randomUUID();channel.postMessage({type:'owner-check',nonce});
}
function show(){
  if(!link){
    const fragment=template.content.cloneNode(true);
    link=fragment.querySelector('a');
    document.querySelector('.header-actions').append(fragment);
    header.classList.add('owner-connected');
  }
  expiry=Date.now()+25000;
  clearTimeout(expiryTimer);expiryTimer=setTimeout(hide,25000);
}
channel.onmessage=event=>{
  const data=event.data;
  if(data?.type==='owner-ready'){request();return;}
  if(data?.type==='owner-left'){hide();request();return;}
  if(data?.type==='owner-confirmed'&&nonce&&data.nonce===nonce&&data.ownerId===ownerId){nonce='';show();}
};
let heartbeat;
function startHeartbeat(){
  clearInterval(heartbeat);
  heartbeat=setInterval(()=>{if(expiry&&Date.now()>expiry)hide();request();},10000);
}
startHeartbeat();
document.addEventListener('visibilitychange',()=>{if(!document.hidden){hide();request();}});
window.addEventListener('pageshow',()=>{startHeartbeat();hide();request();});
window.addEventListener('pagehide',()=>{hide();clearInterval(heartbeat);});
request();
})();

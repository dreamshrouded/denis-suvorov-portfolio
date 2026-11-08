(()=>{
'use strict';
const model=window.PortfolioContent;
const repo='dreamshrouded/denis-suvorov-portfolio';
const apiBase=`https://api.github.com/repos/${repo}`;
const $=selector=>document.querySelector(selector);
let baseline,draft,baseSHA,token='',activeGroup='profile',publishing=false,ready=false,previewReady=false;
const date=value=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
function message(text,error=false){const element=$('#admin-message');element.textContent=text;element.hidden=!text;element.classList.toggle('tone-error',error);}
function bytesToText(base64){return new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g,'')),c=>c.charCodeAt(0)));}
function textToBase64(text){return btoa(Array.from(new TextEncoder().encode(text),byte=>String.fromCharCode(byte)).join(''));}
function changed(){return !draft||!baseline?[]:model.fields.filter(field=>draft.values[field.key]!==baseline.values[field.key]);}
function updateDraftStatus(){
  const count=changed().length;
  $('#draft-status').textContent=count?'Есть изменения':'Без изменений';
  $('#draft-description').textContent=count?`Изменено полей: ${count}. Публичный сайт пока не изменён.`:'Загружена последняя версия из репозитория.';
  $('#draft-pill').textContent=count?'Черновик':'Опубликовано';
  $('#change-count').textContent=count?`Изменено полей: ${count}`:'Нет изменений';
  $('#preview-button').disabled=!ready||publishing;
  $('#publish-button').disabled=!count||publishing;
  $('#reload-content').disabled=publishing;
}
async function github(path,options={}){
  const response=await fetch(apiBase+path,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000),...options,headers:{Accept:'application/vnd.github+json',...(token?{Authorization:`Bearer ${token}`} : {}),...options.headers}});
  if(!response.ok){
    const descriptions={401:'GitHub не принял ключ. Подключитесь заново.',403:'GitHub ограничил доступ. Проверьте срок действия ключа, доступ к репозиторию и разрешение Contents: Read and write. Для чтения без ключа также действует лимит запросов.',404:'Файл или проверка пока отсутствуют в репозитории.',409:'Содержимое на GitHub изменилось. Загрузите свежую версию перед публикацией.',422:'GitHub не принял изменения. Загрузите свежую версию и повторите публикацию.'};
    throw new Error(descriptions[response.status]||`GitHub вернул ошибку ${response.status}. Повторите позже.`);
  }
  return response.status===204?null:response.json();
}
async function readContent(){const file=await github('/contents/content.json?ref=main');return {content:model.clean(JSON.parse(bytesToText(file.content))),sha:file.sha};}
function renderGroup(){
  const groupIndex=model.groups.findIndex(([key])=>key===activeGroup);
  $('#group-title').textContent=model.groups[groupIndex][1];
  $('#group-number').textContent=`${String(groupIndex+1).padStart(2,'0')} / ${String(model.groups.length).padStart(2,'0')}`;
  const container=$('#content-fields');container.replaceChildren();
  model.fields.filter(field=>field.group===activeGroup).forEach(field=>{
    const row=document.createElement('div');row.className='field-row';
    const label=document.createElement('label');label.htmlFor='field-'+field.key;label.textContent=field.label;
    const input=document.createElement(field.maxLength>300||draft.values[field.key].includes('\n')?'textarea':'input');
    input.id='field-'+field.key;input.name=field.key;input.value=draft.values[field.key];input.maxLength=field.maxLength;input.required=true;
    if(input.tagName==='INPUT') input.type=field.type==='email'?'email':field.type==='url'?'url':'text';
    if(field.key==='graduation')input.inputMode='numeric';
    const meta=document.createElement('div');meta.className='field-meta';meta.id='meta-'+field.key;meta.textContent=`${input.value.length} / ${field.maxLength}`;input.setAttribute('aria-describedby',meta.id);
    input.addEventListener('input',()=>{draft.values[field.key]=input.value;meta.textContent=`${input.value.length} / ${field.maxLength}`;updateDraftStatus();});
    row.append(label,input,meta);container.append(row);
  });
  document.querySelectorAll('.section-link').forEach(button=>button.setAttribute('aria-current',String(button.dataset.group===activeGroup)));
}
model.groups.forEach(([key,label])=>{
  const button=document.createElement('button');button.type='button';button.className='section-link';button.dataset.group=key;button.textContent=label;
  button.addEventListener('click',()=>{activeGroup=key;if(ready)renderGroup();});$('#section-links').append(button);
});
function setContent(content,sha){baseline=structuredClone(content);draft=structuredClone(content);baseSHA=sha;ready=true;renderGroup();updateDraftStatus();}
async function loadContent(){
  try{const remote=await readContent();setContent(remote.content,remote.sha);message('');}
  catch(error){
    if(!ready){try{const response=await fetch('content.json',{cache:'no-cache',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();setContent(model.clean(await response.json()),null);$('#draft-description').textContent='Версия с сайта. Для публикации загрузите свежую версию с GitHub.';}catch(_){$('#draft-status').textContent='Не удалось загрузить';}}
    message(error.message||'Не удалось загрузить содержимое. Проверьте соединение.',true);
  }
}
$('#reload-content').addEventListener('click',()=>{if(changed().length&&!window.confirm('Загрузить версию с GitHub? Несохранённые изменения в этой вкладке будут потеряны.'))return;loadContent();});
$('#content-form').addEventListener('submit',event=>event.preventDefault());
window.addEventListener('beforeunload',event=>{if(changed().length){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>{window.PortfolioOwnerSession?.clear();token='';$('#github-token').value='';});
window.addEventListener('pageshow',event=>{if(event.persisted){$('#connection-status').textContent='Публикация защищена GitHub';$('#open-connect').hidden=false;$('#disconnect').hidden=true;}});

const themeButton=$('#admin-theme');
function syncTheme(){const dark=document.documentElement.dataset.theme==='dark';themeButton.textContent=dark?'Светлая тема':'Тёмная тема';themeButton.setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');}
syncTheme();themeButton.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('portfolio-theme',next);}catch(_){}syncTheme();});

document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-view]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));
 $('#editor-view').hidden=button.dataset.view!=='editor';$('#health-view').hidden=button.dataset.view!=='health';
}));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$('#'+button.dataset.close).close()));
const connect=$('#connect-dialog');
$('#open-connect').addEventListener('click',()=>connect.showModal());
$('#disconnect').addEventListener('click',()=>{window.PortfolioOwnerSession?.clear();token='';$('#connection-status').textContent='Публикация защищена GitHub';$('#open-connect').hidden=false;$('#disconnect').hidden=true;message('Подключение отключено. Ключ удалён из памяти вкладки.');});
connect.addEventListener('close',()=>{$('#github-token').value='';});
$('#connect-form').addEventListener('submit',async event=>{
 event.preventDefault();const input=$('#github-token');const candidate=input.value.trim();input.value='';
 if(!candidate){$('#connect-message').textContent='Введите ключ доступа GitHub.';return;}
 token=candidate;const submit=event.target.querySelector('button');submit.disabled=true;$('#connect-message').textContent='Проверяем право публикации…';
 try{
  const repository=await github('');
  if(!repository.permissions?.push)throw Error('У этого ключа нет права записи в репозиторий сайта.');
  await window.PortfolioOwnerSession.connect(token);
  // Checking repository ownership does not expose or save the credential.
  $('#connection-status').textContent='GitHub подключён · доступ к публикации';$('#open-connect').hidden=true;$('#disconnect').hidden=false;connect.close();message('GitHub владельца подключён. Нажмите «Открыть сайт»: в его шапке появится кнопка управления. Оставьте эту панель открытой.');
 }catch(error){window.PortfolioOwnerSession?.clear();token='';$('#connect-message').textContent=error.message||'Подключение не удалось. Проверьте соединение.';}
 finally{submit.disabled=false;}
});

function sendPreview(){if(previewReady&&draft)$('#preview-frame').contentWindow.postMessage({type:'portfolio-preview',content:model.clean(draft),theme:document.documentElement.dataset.theme},'*');}
window.addEventListener('message',event=>{if(event.source===$('#preview-frame').contentWindow&&event.data?.type==='portfolio-preview-ready'){previewReady=true;sendPreview();}});
$('#preview-button').addEventListener('click',()=>{
 try{model.validate(draft);$('#preview-dialog').showModal();const frame=$('#preview-frame');previewReady=false;frame.src='./?preview=1';}
 catch(error){message(error.message,true);}
});
$('#preview-dialog').addEventListener('close',()=>{previewReady=false;$('#preview-frame').removeAttribute('src');});
$('#publish-button').addEventListener('click',()=>{
 try{
  model.validate(draft);if(!token){$('#connect-message').textContent='Подключите GitHub, чтобы опубликовать подготовленные изменения.';connect.showModal();return;}
  if(!baseSHA){message('Сначала загрузите свежую версию с GitHub. Скопируйте важные изменения перед загрузкой.',true);return;}
  const list=$('#publish-changes');list.replaceChildren();
  changed().forEach(field=>{const item=document.createElement('li');const title=document.createElement('strong');title.textContent=model.groups.find(([key])=>key===field.group)[1]+' · '+field.label;const old=document.createElement('small');old.textContent='Было: '+baseline.values[field.key];const next=document.createElement('small');next.textContent='Будет: '+draft.values[field.key];item.append(title,old,next);list.append(item);});
  $('#publish-message').textContent='';$('#publish-dialog').showModal();
 }catch(error){message(error.message,true);}
});
$('#confirm-publish').addEventListener('click',async()=>{
 if(publishing)return;publishing=true;$('#confirm-publish').disabled=true;$('#publish-message').textContent='Сохраняем изменения в GitHub…';updateDraftStatus();
 try{
  const content=model.clean(draft);const remote=await readContent();
  if(remote.sha!==baseSHA)throw Error('На GitHub появилась новая версия. Ваш черновик сохранён в этой вкладке. Скопируйте изменения и загрузите свежую версию: публикация остановлена, чтобы не перезаписать чужие правки.');
  const result=await github('/contents/content.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Update portfolio content from management panel',branch:'main',sha:baseSHA,content:textToBase64(JSON.stringify(content,null,2)+'\n')})});
  setContent(content,result.content.sha);$('#publish-dialog').close();message('Изменения сохранены в GitHub. Публикация GitHub Pages запущена; она обычно занимает несколько минут. Состояние сборки можно проверить во вкладке Actions репозитория.');
 }catch(error){$('#publish-message').textContent=error.message||'Публикация не удалась. Проверьте соединение.';}
 finally{publishing=false;$('#confirm-publish').disabled=false;updateDraftStatus();}
});

function setTone(element,tone){element.classList.remove('tone-ok','tone-error','tone-warning');if(tone)element.classList.add('tone-'+tone);}
async function refreshHistory(){
 const button=$('#refresh-history');button.disabled=true;
 try{
  const result=await github('/actions/workflows/site-health.yml/runs?per_page=10');const runs=result.workflow_runs||[];const list=$('#history');list.replaceChildren();
  if(!runs.length){const li=document.createElement('li');li.className='empty-state';li.textContent='Первая проверка ещё не выполнена.';list.append(li);$('#monitor-status').textContent='Ожидает запуска';$('#monitor-description').textContent='Расписание задано: каждые 30 минут.';setTone($('#monitor-status'),'warning');return;}
  const latestCompleted=runs.find(run=>run.status==='completed');
  for(const run of runs.slice(0,7)){
   const li=document.createElement('li');const copy=document.createElement('div');const a=document.createElement('a');a.href=run.html_url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=date(run.created_at)+' ↗';const small=document.createElement('small');small.textContent=run.event==='schedule'?'По расписанию':run.event==='workflow_dispatch'?'Ручной запуск':'После публикации';copy.append(a,small);const result=document.createElement('span');result.className='check-result';result.textContent=run.status!=='completed'?'В процессе':run.conclusion==='success'?'Успешно':run.conclusion==='failure'?'Ошибка':'Прервано';setTone(result,run.status!=='completed'?'warning':run.conclusion==='success'?'ok':'error');li.append(copy,result);list.append(li);
  }
  const stale=!latestCompleted||Date.now()-new Date(latestCompleted.updated_at).getTime()>90*60*1000;
  $('#monitor-status').textContent=stale?'Нет свежей проверки':latestCompleted.conclusion==='success'?'Последняя — успешно':'Требует внимания';
  setTone($('#monitor-status'),stale?'warning':latestCompleted.conclusion==='success'?'ok':'error');
  $('#monitor-description').textContent=stale?'Нет завершённой проверки за 90 минут. Откройте GitHub Actions и проверьте расписание.':`Завершена ${date(latestCompleted.updated_at)}. Проверки примерно каждые 30 минут.`;
 }catch(error){$('#monitor-status').textContent='Статус неизвестен';setTone($('#monitor-status'),'warning');$('#monitor-description').textContent='Не удалось получить историю из GitHub.';const li=document.createElement('li');li.className='empty-state';li.textContent=error.message||'Проверьте соединение.';$('#history').replaceChildren(li);}
 finally{button.disabled=false;}
}
$('#refresh-history').addEventListener('click',refreshHistory);
$('#check-now').addEventListener('click',async()=>{
 const button=$('#check-now');button.disabled=true;const list=$('#checks');list.replaceChildren();let failed=0;
 $('#live-status').textContent='Проверяем…';setTone($('#live-status'),'');
 const resources=[['Главная страница','./','html'],['Содержимое','content.json','json'],['Оформление','styles.css'],['Сценарии сайта','app.js'],['Модель содержимого','content.js'],['Настройка темы','theme-init.js'],['Панель управления','admin.html','admin'],['Сценарии панели','admin.js'],['Оформление панели','admin.css'],['Иллюстрация «Высота»','vysota-960.webp'],['Иллюстрация Сбер','sber-960.webp'],['Иллюстрация Employcity','employcity-960.webp'],['Иконка сайта','favicon.svg']];
 await Promise.all(resources.map(async([label,path,type])=>{
  const li=document.createElement('li'),copy=document.createElement('div'),title=document.createElement('span'),small=document.createElement('small'),status=document.createElement('span');copy.className='check-label';title.textContent=label;small.textContent=path;copy.append(title,small);status.textContent='Проверяем…';status.className='check-result';li.append(copy,status);list.append(li);const start=performance.now();
  try{
   const response=await fetch(new URL(path,location.href),{method:type?'GET':'HEAD',cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   if(type==='json')model.validate(await response.json());
   if(type==='html'){const page=new DOMParser().parseFromString(await response.text(),'text/html');if(!page.querySelector('#experience')||!page.querySelector('#contact-dialog')||!page.querySelector('#expertise'))throw Error('Не найдены обязательные разделы');}
   if(type==='admin'&&!(await response.text()).includes('content-form'))throw Error('Не найдена панель управления');
   status.textContent=`✓ ${Math.round(performance.now()-start)} мс`;setTone(status,'ok');
  }catch(error){failed++;status.textContent='Ошибка';setTone(status,'error');small.textContent=error.name==='TimeoutError'?'Превышено время ожидания':error.message||'Нет соединения';}
 }));
 $('#live-status').textContent=failed?'Есть ошибки':'Сайт доступен';setTone($('#live-status'),failed?'error':'ok');const now=new Date();$('#check-time').textContent=date(now);$('#live-description').textContent=`${date(now)} · ${resources.length-failed} из ${resources.length} проверок успешно. Это проверка из вашего браузера.`;button.disabled=false;
});
loadContent();refreshHistory();
})();

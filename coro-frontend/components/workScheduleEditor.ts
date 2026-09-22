export type WorkSlot = { dayOfWeek:number; startTime:number; endTime:number };
export type ScheduleDraft = { timeZone:string; effectiveFrom:string; slots:WorkSlot[] };
export const WEEK_DAYS=[{value:1,label:'Lundi'},{value:2,label:'Mardi'},{value:3,label:'Mercredi'},{value:4,label:'Jeudi'},{value:5,label:'Vendredi'},{value:6,label:'Samedi'},{value:0,label:'Dimanche'}];
const weekdays=(startTime:number,endTime:number,afternoonStart?:number):WorkSlot[]=>WEEK_DAYS.filter(d=>d.value>=1&&d.value<=5).flatMap(d=>afternoonStart===undefined?[{dayOfWeek:d.value,startTime,endTime}]:[{dayOfWeek:d.value,startTime,endTime:720},{dayOfWeek:d.value,startTime:afternoonStart,endTime}]);
export const SCHEDULE_TEMPLATES=[
 {id:'40',label:'Standard 40 h',description:'Lun–Ven · 08:00–12:00 et 13:00–17:00',slots:weekdays(480,1020,780)},
 {id:'37.5',label:'Standard 37,5 h',description:'Lun–Ven · 08:30–12:00 et 13:00–17:00',slots:weekdays(510,1020,780)},
 {id:'35',label:'9 à 17 · 35 h',description:'Lun–Ven · pause 12:00–13:00 exclue',slots:weekdays(540,1020,780)},
 {id:'part-time',label:'Temps partiel',description:'Lun–Mer · 09:00–12:00 et 13:00–16:00',slots:[1,2,3].flatMap(dayOfWeek=>[{dayOfWeek,startTime:540,endTime:720},{dayOfWeek,startTime:780,endTime:960}])},
] as const;
export const UNAVAILABILITY_LABELS:Record<string,string>={VACATION:'Vacances',SICK:'Maladie',TRAINING:'Formation',TRAVEL:'Déplacement',ADMIN_BLOCK:'Blocage administratif',PERSONAL:'Personnel',OTHER:'Autre'};
export const toClock=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
export const fromClock=(clock:string)=>{const [h,m]=clock.split(':').map(Number);return h*60+m;};
export const cloneSlots=(slots:WorkSlot[])=>slots.map(slot=>({...slot}));
export const slotsForDay=(slots:WorkSlot[],day:number)=>slots.filter(slot=>slot.dayOfWeek===day).sort((a,b)=>a.startTime-b.startTime);
export function setDayWorking(slots:WorkSlot[],day:number,working:boolean){return working?(slotsForDay(slots,day).length?cloneSlots(slots):[...cloneSlots(slots),{dayOfWeek:day,startTime:540,endTime:1020}]):slots.filter(slot=>slot.dayOfWeek!==day);}
export function copyDay(slots:WorkSlot[],source:number,targets:number[]){const sourceSlots=slotsForDay(slots,source);return [...slots.filter(slot=>!targets.includes(slot.dayOfWeek)),...targets.flatMap(dayOfWeek=>sourceSlots.map(slot=>({...slot,dayOfWeek})))].sort((a,b)=>a.dayOfWeek-b.dayOfWeek||a.startTime-b.startTime);}
export const weeklyMinutes=(slots:WorkSlot[])=>slots.reduce((total,slot)=>total+Math.max(0,slot.endTime-slot.startTime),0);
export function humanMinutes(minutes:number){const h=Math.floor(Math.abs(minutes)/60),m=Math.abs(minutes)%60;return `${minutes<0?'−':''}${h?h+' h':''}${m?`${h?' ':''}${m}`:''}`||'0 h';}
export function nextCivilDate(value:string){const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10);}
export function previousCivilDate(value:string){const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-1);return date.toISOString().slice(0,10);}
export function localDateTimeToIso(value:string,timeZone:string){const [date,clock]=value.split('T');const [year,month,day]=date.split('-').map(Number);const [hour,minute]=clock.split(':').map(Number);const expected=Date.UTC(year,month-1,day,hour,minute);let candidate=expected;const formatter=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});for(let i=0;i<5;i++){const p=Object.fromEntries(formatter.formatToParts(new Date(candidate)).map(x=>[x.type,x.value]));const actual=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute));candidate+=expected-actual;}return new Date(candidate).toISOString();}

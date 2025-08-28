// 8-dim emotion embedding (joy, calm, sad, angry, inspired, grateful, playful, urgent)
const EMO = ['joy','calm','sad','angry','inspired','grateful','playful','urgent'];


const LEX = {
joy: ['happy','ดีใจ','ยินดี','สุข','win','yay','ยิ้ม'],
calm: ['สงบ','นิ่ง','ชิล','พัก','ลมหายใจ','meditate','calm'],
sad: ['เศร้า','เหงา','ร้องไห้','เสียใจ','sad'],
angry: ['โกรธ','โมโห','เดือด','แค้น','angry'],
inspired: ['แรงบันดาลใจ','สู้','ลุย','เป้า','ฝัน','inspire','motivate'],
grateful: ['ขอบคุณ','ซาบซึ้ง','บุญคุณ','gratitude'],
playful: ['ขำ','ฮา','เล่น','มุก','lol','555'],
urgent: ['ด่วน','ช่วยด้วย','ภาวะฉุกเฉิน','now','urgent']
};


export function embedTextEmotion(text=''){
const t = (text||'').toLowerCase();
const v = new Array(8).fill(0);
EMO.forEach((k,i)=>{
const hits = LEX[k].reduce((a,w)=> a + (t.includes(w)?1:0), 0);
v[i] = hits;
});
const s = v.reduce((a,b)=>a+b,0) || 1;
return v.map(x=>x/s);
}


export function parseMoodHint(mood){
const i = EMO.indexOf((mood||'').toLowerCase());
if(i<0) return null;
const v = new Array(8).fill(0); v[i]=1; return v;
}


export function mixVectors(...vs){
const out = new Array(8).fill(0);
vs.filter(Boolean).forEach(v=> v.forEach((x,i)=> out[i]+=x));
const s = out.reduce((a,b)=>a+b,0) || 1;
return out.map(x=>x/s);
}


export function cosSim(a,b){
let dot=0, na=0, nb=0;
for(let i=0;i<8;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
if(na===0||nb===0) return 0;
return dot / (Math.sqrt(na)*Math.sqrt(nb));
}
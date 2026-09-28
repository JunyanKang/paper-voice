const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('addon/translation.js','utf8'),context);
const p=context.PaperVoiceTranslation;
const rect=(left,top,width=220,height=16)=>({left,top,right:left+width,bottom:top+height,width,height});
function layout(rects,{height=650,sentenceRects=rects}={}){
 const frameRect={left:0,top:0,width:640,height},box={style:{},dataset:{},getBoundingClientRect:()=>({height:70})};
 const unit={text:'chunk',sentenceText:'whole sentence'},match={rects};
 p.findSentence=(_reader,u)=>u.text==='chunk'?match:{rects:sentenceRects};
 const caption={box,reader:{},unit,frame:{getBoundingClientRect:()=>frameRect,parentElement:{getBoundingClientRect:()=>({left:0,top:0})}}};
 p.caption=caption;p.positionTranslation(caption);return box;
}
test('cross-column translation stays below the left portion instead of jumping to the right top',()=>{
 const b=layout([rect(48,440),rect(48,460),rect(340,60),rect(340,80)]);
 assert.equal(b.style.top,'484px');assert.equal(b.style.left,'48px');
 assert.ok(parseFloat(b.style.left)+parseFloat(b.style.width)<340);assert.equal(b.style.visibility,'visible');
});
test('when the right continuation scrolls above the viewport the visible left source still has a caption',()=>{
 const b=layout([rect(48,150),rect(48,170),rect(340,-200),rect(340,-180)]);
 assert.equal(b.style.visibility,'visible');assert.equal(b.style.top,'194px');
});
test('right-column spoken chunk anchors to the right with sentence-level column bounds',()=>{
 const b=layout([rect(340,60),rect(340,80)],{sentenceRects:[rect(48,440),rect(48,460),rect(340,60),rect(340,80)]});
 assert.equal(b.style.left,'340px');assert.equal(b.style.top,'104px');assert.ok(parseFloat(b.style.width)<=288);
});
test('when only the right column is visible the caption follows it instead of hiding',()=>{
 const b=layout([rect(48,800),rect(48,820),rect(340,60),rect(340,80)]);
 assert.equal(b.style.visibility,'visible');assert.equal(b.style.left,'340px');
});
test('ordinary line wrapping and inline fragments remain one source block',()=>{
 const r=[rect(170,100,100),rect(48,120,220),rect(48,140,90),rect(140,140,120)];
 assert.equal(p.readingBlocks({rects:r}).length,1);assert.equal(layout(r).style.top,'164px');
});
test('bottom-edge fallback stays above the same column, and completely offscreen sources hide',()=>{
 const b=layout([rect(48,590),rect(48,610),rect(340,60),rect(340,80)]);
 assert.equal(b.dataset.placement,'above-source');assert.equal(b.style.top,'512px');assert.equal(b.style.left,'48px');
 assert.equal(layout([rect(48,-80)]).style.visibility,'hidden');
});

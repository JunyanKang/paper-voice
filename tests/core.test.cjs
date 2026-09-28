const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../addon/core.js');
test('PDF ligatures, line-break hyphens, and whitespace',()=>{
 assert.equal(core.cleanText('The ﬁbers of photo-\nreceptors\n respond.\u00ad'),'The fibers of photoreceptors respond.');
 assert.equal(core.cleanText('cell-type 3-5 β-catenin'),'cell-type 3-5 β-catenin');
});
test('long passages preserve all words in order and bound chunks',()=>{
 const text=Array.from({length:120},(_,i)=>`Sentence ${i} explains the development of retinal cells.`).join(' ');
 const parts=core.chunks(text);
 assert.ok(parts.length>10); assert.ok(parts.every(p=>p.length<=340));assert.equal(parts.join(' '),text);
});
test('very long tokens terminate with bounded chunks',()=>{const p=core.chunks('x'.repeat(1200));assert.equal(p.join(''),'x'.repeat(1200));assert.ok(p.every(x=>x.length<=340));});
test('empty selections do not create speech chunks',()=>assert.deepEqual(core.chunks(' \n '),[]));
test('six voices include male/female US/GB',()=>{assert.equal(core.voices.length,6);for(const a of ['US','GB'])for(const g of ['male','female'])assert.ok(core.voices.some(v=>v.accent===a&&v.gender===g));});
test('rate clamp and default',()=>{assert.equal(core.rate(-8),.6);assert.equal(core.rate(9),1.6);assert.equal(core.rate('bad'),1);});
test('sentences preserve decimal values and scientific wording',()=>{
 const s=core.sentences('The value was 3.14. This suggests an association, not causation.');assert.equal(s.length,2);assert.ok(s[0].includes('3.14'));assert.ok(s[1].includes('not causation'));
});

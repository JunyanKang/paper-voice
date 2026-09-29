const {test}=require('node:test'),assert=require('node:assert/strict'),core=require('../addon/core.js');
const full='The retinal cells collect light and guide it toward the photoreceptors while preserving the spatial pattern across the neural tissue.';
const a='The retinal cells collect light and guide it toward the photoreceptors',b='while preserving the spatial pattern across the neural tissue.';
const item=(str,x,y)=>({str,transform:[11,0,0,11,x,y],height:11,width:200,hasEOL:true});
test('PDF geometry splits a short sentence at its column boundary before audio generation',()=>{
 const page=core.pdfLayout([item(a,48,264),item(b,330,720)],0),units=core.layoutUnits([page]);
 assert.equal(units.length,2);assert.deepEqual(units.map(u=>u.spokenText),[a,b]);
 assert.ok(units.every(u=>u.translationText===full));assert.equal(units[1].anchorOffset,core.anchorText(a).length);
 assert.deepEqual(units.map(u=>u.highlightText),[a,b]);
});
test('a cross-page sentence preserves one translation while audio and anchors change pages',()=>{
 const pages=[core.pdfLayout([item(a,48,65)],0),core.pdfLayout([item(b,48,720)],1)];
 for(const selection of [null,full]){
  const units=core.layoutUnits(pages,selection);assert.deepEqual(units.map(u=>u.pageIndex),[0,1]);
  assert.deepEqual(units.map(u=>u.spokenText),[a,b]);assert.ok(units.every(u=>u.translationText===full));assert.equal(units[1].anchorOffset,0);
 }
});
test('citations split across columns/pages stay silent in both audio parts',()=>{
 const pages=[{text:'Cells guide light (Labin et al.,',pageIndex:0},{text:'2014; Zueva et al., 2014), toward the retina.',pageIndex:1}];
 const units=core.layoutUnits(pages);assert.ok(!units.some(u=>/Labin|Zueva|2014|et al/.test(u.spokenText)));
 assert.match(units.map(u=>u.spokenText).join(' '),/Cells guide light.*toward the retina/);
 assert.ok(units.every(u=>u.translationText.includes('Labin')));
});
test('layout preserves normal line wraps, word order, page progress and unknown-selection fallback',()=>{
 const page=core.pdfLayout([item('The cells',48,700),item('guide light.',48,684)],3);
 assert.equal(page.breaks.length,0);const u=core.layoutUnits([page]);assert.equal(u.length,1);assert.equal(u[0].spokenText,'The cells guide light.');assert.equal(u[0].pageIndex,3);
 assert.equal(core.layoutUnits([page],'Missing text'),null);
});
test('single-sentence selection maps within a larger paragraph without reading its neighbours',()=>{
 const pages=[{text:'Previous sentence. '+a,pageIndex:0},{text:b+' Next sentence.',pageIndex:1}];
 const units=core.layoutUnits(pages,full);assert.equal(units.length,2);assert.equal(units.map(u=>u.text).join(' '),full);
 assert.equal(units[0].anchorOffset,core.anchorText('Previous sentence.').length);
});
test('figure/table references are silent including panels, supplements and extended data',()=>{
 for(const ref of ['Figure 2','fig. 2a','Figs. 2a, b and c','Supplementary Fig. S1','Supplementary Tables 1–3','Extended Fig. 4','Extended Data Figs. 2–4','see also Fig. 2; Supplementary Table S1','Table IV']){
  assert.equal(core.speechText('Cells ('+ref+') guide light.'),'Cells guide light.',ref);
 }
 assert.equal(core.speechText('Cells shown in Fig. 2a guide light.'),'Cells shown in guide light.');
 assert.equal(core.speechText('Cells (20 mm2) express SOX2.'),'Cells (20 mm2) express SOX2.');
 assert.equal(core.sentences('Cells (Supplementary Fig. S1) guide light. Next sentence.').length,2);
});
test('figure references spanning a layout boundary never leak into either spoken fragment',()=>{
 const units=core.layoutUnits([{text:'Cells guide light (Supplementary Fig.',pageIndex:0},{text:'S2a; Extended Data Table 1) into the retina.',pageIndex:1}]);
 assert.equal(units.map(u=>u.spokenText).join(' '),'Cells guide light into the retina.');
 assert.ok(units.every(u=>u.translationText.includes('Supplementary')));
});
test('selected position rewinds to sentence start across column and page fragments',()=>{
 const pages=[core.pdfLayout([item('First sentence.',48,700),item(a,48,50)],0),core.pdfLayout([item(b,48,700),item('Final sentence.',48,670)],1)];
 const units=core.layoutUnits(pages),index=core.selectedSentenceIndex(units,1,10);
 assert.equal(units[index].text,a);assert.equal(units[index].pageIndex,0);assert.equal(units.slice(index).at(-1).text,'Final sentence.');
 assert.equal(core.selectedSentenceIndex(units,8,0),-1);
});

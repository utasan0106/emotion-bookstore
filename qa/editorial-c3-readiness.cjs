'use strict';
// Empty glyph evidence is never success. Only emptiness gets a bounded visible-
// paint retry; a real fallback font is returned immediately for strict rejection.
async function readPaintedFonts(probe,prepare,maxAttempts=3){
  if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3)throw Error('Invalid bounded font attempts');
  const attempts=[];let fonts=[];
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    fonts=await probe();attempts.push({attempt,glyphFonts:fonts.length});
    if(fonts.length)break;
    if(attempt<maxAttempts)await prepare(attempt);
  }
  return {fonts,attempts};
}
module.exports={readPaintedFonts};

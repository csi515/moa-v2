/** tsx 테스트에서 .css import를 빈 모듈로 바꾼다 (Vite 전용 import를 node에서 실행할 때). */
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`export async function load(url, ctx, next){ if(url.endsWith('.css')) return {format:'module',source:'export default {}',shortCircuit:true}; return next(url, ctx);}`));
